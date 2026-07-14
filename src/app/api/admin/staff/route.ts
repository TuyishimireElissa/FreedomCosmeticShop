export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, requireRole } from '@/lib/auth'
import { normalizeRwandaPhone } from '@/lib/phone'
import { logActivity } from '@/server/services/activity'
import { enqueueSms } from '@/server/services/sms-queue'
import { features } from '@/lib/env'

const DEPARTMENTS = ['SALES', 'MARKETING', 'LOGISTICS', 'SUPPORT', 'FINANCE', 'MANAGEMENT'] as const
const STAFF_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['orders.read','orders.update','orders.refund','products.crud','customers.crud','deliveries.crud','coupons.crud','banners.crud','sms.send','sms.schedule','analytics.read','reports.read','staff.manage','settings.update'],
  MANAGER: ['orders.read','orders.update','products.read','products.update','customers.read','customers.update','deliveries.read','deliveries.update','coupons.read','coupons.update','banners.read','banners.update','sms.send','analytics.read','reports.read'],
  STAFF: ['orders.read','orders.update','products.read','customers.read','deliveries.read','deliveries.update','sms.send','analytics.read'],
}

const strongPassword = z.string().min(12).max(200)
  .regex(/[a-z]/, 'Temporary password needs a lowercase letter')
  .regex(/[A-Z]/, 'Temporary password needs an uppercase letter')
  .regex(/\d/, 'Temporary password needs a number')
  .regex(/[^A-Za-z0-9]/, 'Temporary password needs a symbol')

const createSchema = z.object({
  name: z.string().trim().min(3).max(100),
  phone: z.string().min(9).max(20),
  email: z.string().email().optional(),
  password: strongPassword.optional(),
  temporaryPassword: strongPassword.optional(),
  role: z.enum(STAFF_ROLES),
  department: z.enum(DEPARTMENTS),
  position: z.string().trim().min(2).max(100),
  permissions: z.array(z.string().min(1)).max(100).optional(),
  notes: z.string().max(1000).optional(),
}).refine((value) => value.password || value.temporaryPassword, { message: 'Temporary password is required' })

function permissionObject(permissions: string[]) {
  return Object.fromEntries(permissions.map((permission) => [permission, true]))
}

export async function GET() {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    const [users, accounts] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['ADMIN','SUPER_ADMIN','STAFF','MANAGER'] } },
        select: { id:true,name:true,phone:true,email:true,role:true,avatar:true,isDeleted:true,mfaEnabled:true,mustChangePassword:true,lastLoginAt:true,createdAt:true,staffProfile:true },
        orderBy: [{ role:'asc' },{ createdAt:'desc' }],
      }),
      prisma.staffAccount.findMany(),
    ])
    const staff = users.map((user) => ({ ...user, isActive: !user.isDeleted && (user.staffProfile?.isActive ?? true), staffAccount: accounts.find((account) => account.userId === user.id) || null }))
    return NextResponse.json({ success:true, data:{ staff }, staff })
  } catch (error) {
    const status=error instanceof Error&&'statusCode'in error?Number((error as {statusCode:number}).statusCode):500
    console.error('Staff list error:',error)
    return NextResponse.json({success:false,error:status===500?'Failed to fetch staff':(error as Error).message},{status})
  }
}

export async function POST(request: Request) {
  try {
    const creator=await requireRole('SUPER_ADMIN')
    const parsed=createSchema.safeParse(await request.json())
    if(!parsed.success)return NextResponse.json({success:false,error:parsed.error.issues[0]?.message||'Invalid staff data',details:parsed.error.flatten()},{status:400})
    const input=parsed.data
    let phone:string
    try{phone=normalizeRwandaPhone(input.phone)}catch{return NextResponse.json({success:false,error:'Invalid Rwanda phone number'},{status:400})}
    const email=input.email?.trim().toLowerCase()||null
    const existing=await prisma.user.findFirst({where:{OR:[{phone},...(email?[{email}]:[])]}})
    if(existing)return NextResponse.json({success:false,error:'Phone or email already registered'},{status:409})
    const temporaryPassword=input.temporaryPassword||input.password!
    const permissions=input.permissions||DEFAULT_PERMISSIONS[input.role]
    const employeeId=`${input.department.slice(0,3)}-${new Date().getFullYear()}-${crypto.randomInt(100000,999999)}`
    const user=await prisma.$transaction(async(tx)=>{
      const created=await tx.user.create({data:{name:input.name,phone,email,passwordHash:await hashPassword(temporaryPassword),role:input.role,mustChangePassword:true,isTestAccount:false}})
      await tx.staffProfile.create({data:{userId:created.id,employeeId,department:input.department,position:input.position,permissions:JSON.stringify(permissions),isActive:true}})
      await tx.staffAccount.create({data:{userId:created.id,employeeName:input.name,employeePhone:phone,department:input.department,createdBy:creator.id,isActive:true,permissions:permissionObject(permissions),notes:input.notes||null}})
      return created
    })
    let credentialDelivery='NOT_CONFIGURED'
    if(features.sms){
      enqueueSms(phone,`FreedomCosmeticShop staff account created. Login: https://freedom-cosmetic-shop.vercel.app/admin Phone: ${phone} Temporary password: ${temporaryPassword} Change it immediately after login.`,{priority:0,template:'STAFF_ACCOUNT_CREATED',maxAttempts:3})
      credentialDelivery='QUEUED'
    }
    await logActivity({userId:creator.id,userName:creator.name,userRole:creator.role,action:'STAFF_CREATED',entityType:'STAFF',entityId:user.id,description:`Created separate ${input.role} account for ${input.name}; SMS=${credentialDelivery}`,severity:'critical',req:request})
    const data={id:user.id,name:user.name,phone:user.phone,email:user.email,role:user.role,employeeId,mustChangePassword:true,credentialDelivery}
    return NextResponse.json({success:true,data,user:data,employeeId},{status:201})
  } catch(error){
    const status=error instanceof Error&&'statusCode'in error?Number((error as {statusCode:number}).statusCode):500
    console.error('Staff create error:',error)
    return NextResponse.json({success:false,error:status===500?'Failed to create staff account':(error as Error).message},{status})
  }
}
