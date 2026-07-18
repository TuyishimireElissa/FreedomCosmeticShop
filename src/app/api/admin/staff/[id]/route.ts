export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, requireRole } from '@/lib/auth'
import { logActivity } from '@/server/services/activity'

const strongPassword=z.string().min(12).max(200).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/).regex(/[^A-Za-z0-9]/)
const updateSchema=z.object({
  role:z.enum(['ADMIN','STAFF','MANAGER']).optional(),
  department:z.enum(['SALES','MARKETING','LOGISTICS','SUPPORT','FINANCE','MANAGEMENT']).optional(),
  position:z.string().min(2).max(100).optional(),
  permissions:z.array(z.string().min(1)).max(100).optional(),
  isActive:z.boolean().optional(),
  resetPassword:strongPassword.optional(),
  notes:z.string().max(1000).nullable().optional(),
})

function permissionObject(permissions:string[]){return Object.fromEntries(permissions.map((permission)=>[permission,true]))}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const actor=await requireRole('ADMIN','SUPER_ADMIN')
    const parsed=updateSchema.safeParse(await request.json())
    if(!parsed.success)return NextResponse.json({success:false,error:parsed.error.issues[0]?.message||'Invalid update',details:parsed.error.flatten()},{status:400})
    const input=parsed.data
    const sensitive=Boolean(input.role||input.resetPassword||input.isActive===false)
    if(sensitive&&actor.role!=='SUPER_ADMIN')return NextResponse.json({success:false,error:'Super Admin required for role, password, or deactivation changes'},{status:403})
    if(id===actor.id&&(input.isActive===false||input.role))return NextResponse.json({success:false,error:'You cannot deactivate or change your own role'},{status:400})
    const existing=await prisma.user.findFirst({where:{id:id,role:{in:['ADMIN','SUPER_ADMIN','STAFF','MANAGER']}},include:{staffProfile:true}})
    if(!existing)return NextResponse.json({success:false,error:'Staff account not found'},{status:404})
    if(existing.role==='SUPER_ADMIN'&&input.isActive===false){
      const activeSuperAdmins=await prisma.user.count({where:{role:'SUPER_ADMIN',isDeleted:false}})
      if(activeSuperAdmins<=1)return NextResponse.json({success:false,error:'Cannot deactivate the last Super Admin'},{status:400})
    }
    const changes:string[]=[]
    await prisma.$transaction(async(tx)=>{
      const userData:{role?:string;passwordHash?:string;mustChangePassword?:boolean;passwordChangedAt?:Date|null;isDeleted?:boolean}={}
      if(input.role&&input.role!==existing.role){userData.role=input.role;changes.push(`role:${existing.role}->${input.role}`)}
      if(input.resetPassword){userData.passwordHash=await hashPassword(input.resetPassword);userData.mustChangePassword=true;userData.passwordChangedAt=null;changes.push('temporary password reset')}
      if(typeof input.isActive==='boolean'){userData.isDeleted=!input.isActive;changes.push(`active:${input.isActive}`)}
      if(Object.keys(userData).length)await tx.user.update({where:{id:id},data:userData})
      const profileData:{department?:string;position?:string;permissions?:string;isActive?:boolean}={}
      if(input.department){profileData.department=input.department;changes.push(`department:${input.department}`)}
      if(input.position){profileData.position=input.position;changes.push(`position:${input.position}`)}
      if(input.permissions){profileData.permissions=JSON.stringify(input.permissions);changes.push(`permissions:${input.permissions.length}`)}
      if(typeof input.isActive==='boolean')profileData.isActive=input.isActive
      if(existing.staffProfile&&Object.keys(profileData).length)await tx.staffProfile.update({where:{userId:id},data:profileData})
      await tx.staffAccount.upsert({
        where:{userId:id},
        create:{userId:id,employeeName:existing.name,employeePhone:existing.phone,department:input.department||existing.staffProfile?.department||null,createdBy:actor.id,isActive:input.isActive??true,permissions:permissionObject(input.permissions||safePermissions(existing.staffProfile?.permissions)),notes:input.notes||null,lastActivityAt:new Date()},
        update:{department:input.department,isActive:input.isActive,permissions:input.permissions?permissionObject(input.permissions):undefined,notes:input.notes,lastActivityAt:new Date()},
      })
    })
    await logActivity({userId:actor.id,userName:actor.name,userRole:actor.role,action:'STAFF_UPDATED',entityType:'STAFF',entityId:id,description:`Updated ${existing.name}: ${changes.join(', ')||'metadata'}`,severity:sensitive?'critical':'warn',req:request})
    const user=await prisma.user.findUnique({where:{id:id},select:{id:true,name:true,phone:true,email:true,role:true,isDeleted:true,mfaEnabled:true,mustChangePassword:true,lastLoginAt:true,staffProfile:true}})
    return NextResponse.json({success:true,data:{user},user})
  }catch(error){
    const status=error instanceof Error&&'statusCode'in error?Number((error as{statusCode:number}).statusCode):500
    console.error('Staff update error:',error)
    return NextResponse.json({success:false,error:status===500?'Failed to update staff':(error as Error).message},{status})
  }
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params
    const actor=await requireRole('SUPER_ADMIN')
    if(id===actor.id)return NextResponse.json({success:false,error:'You cannot deactivate yourself'},{status:400})
    const target=await prisma.user.findFirst({where:{id:id,role:{in:['ADMIN','SUPER_ADMIN','STAFF','MANAGER']}}})
    if(!target)return NextResponse.json({success:false,error:'Staff account not found'},{status:404})
    if(target.role==='SUPER_ADMIN'){
      const count=await prisma.user.count({where:{role:'SUPER_ADMIN',isDeleted:false}})
      if(count<=1)return NextResponse.json({success:false,error:'Cannot deactivate the last Super Admin'},{status:400})
    }
    await prisma.$transaction([
      prisma.user.update({where:{id:id},data:{isDeleted:true,deletedAt:new Date()}}),
      prisma.staffProfile.updateMany({where:{userId:id},data:{isActive:false}}),
      prisma.staffAccount.updateMany({where:{userId:id},data:{isActive:false,lastActivityAt:new Date()}}),
    ])
    await logActivity({userId:actor.id,userName:actor.name,userRole:actor.role,action:'STAFF_DEACTIVATED',entityType:'STAFF',entityId:target.id,description:`Deactivated separate staff account for ${target.name} (${target.role})`,severity:'critical',req:request})
    return NextResponse.json({success:true,data:{deactivated:true},message:'Staff account deactivated'})
  }catch(error){
    const status=error instanceof Error&&'statusCode'in error?Number((error as{statusCode:number}).statusCode):500
    console.error('Staff deactivation error:',error)
    return NextResponse.json({success:false,error:status===500?'Failed to deactivate staff':(error as Error).message},{status})
  }
}

function safePermissions(value:string|undefined){if(!value)return[];try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.filter((item):item is string=>typeof item==='string'):[]}catch{return[]}}
