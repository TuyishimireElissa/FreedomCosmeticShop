import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import cloudinary from '@/lib/cloudinary'
import { requireRole } from '@/lib/auth'
import { emitRealtimeEvent } from '@/lib/event-bus'

const allowed = new Set(['image/jpeg','image/png','image/webp'])
const maxSize = 5 * 1024 * 1024

export async function GET() {
  try {
    await requireRole('ADMIN','MANAGER','STAFF')
    const settings = await prisma.storeSettings.findFirst({ select: { logoUrl: true, logoPublicId: true, logoUpdatedAt: true } })
    const data = { logoUrl: settings?.logoUrl || null, logoPublicId: settings?.logoPublicId || null, logoUpdatedAt: settings?.logoUpdatedAt || null }
    return NextResponse.json({ success: true, data, ...data })
  } catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as {statusCode:number}).statusCode) : 500; return NextResponse.json({ success:false,error:status===500?'Failed to load logo':(error as Error).message },{status}) }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole('ADMIN','MANAGER')
    const form = await request.formData(); const file = form.get('logo')
    if (!(file instanceof File)) return NextResponse.json({success:false,error:'Logo file is required'},{status:400})
    if (!allowed.has(file.type)) return NextResponse.json({success:false,error:'Use a JPEG, PNG, or WebP image'},{status:400})
    if (file.size < 1 || file.size > maxSize) return NextResponse.json({success:false,error:'Logo must be smaller than 5 MB'},{status:400})
    const buffer = Buffer.from(await file.arrayBuffer()); const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`
    const uploaded = await cloudinary.uploader.upload(dataUri,{folder:'freedomcosmeticshop/logo',resource_type:'image',overwrite:false,transformation:[{width:800,height:800,crop:'limit'},{quality:'auto'},{fetch_format:'auto'}]})
    let settings = await prisma.storeSettings.findFirst()
    if (!settings) settings = await prisma.storeSettings.create({data:{}})
    const oldPublicId = settings.logoPublicId
    const updated = await prisma.storeSettings.update({where:{id:settings.id},data:{logoUrl:uploaded.secure_url,logoPublicId:uploaded.public_id,logoUpdatedAt:new Date()}})
    if (oldPublicId && oldPublicId !== uploaded.public_id) await cloudinary.uploader.destroy(oldPublicId).catch(()=>{})
    emitRealtimeEvent('logo:updated',{logoUrl:updated.logoUrl,storeName:updated.storeName},{source:admin.name})
    const data={logoUrl:updated.logoUrl,logoPublicId:updated.logoPublicId}
    return NextResponse.json({success:true,data,...data},{status:201})
  } catch (error) { const status=error instanceof Error&&'statusCode'in error?Number((error as {statusCode:number}).statusCode):500;console.error('Logo upload error:',error);return NextResponse.json({success:false,error:status===500?'Logo upload failed':(error as Error).message},{status}) }
}

export async function DELETE() {
  try {
    const admin=await requireRole('ADMIN','MANAGER');const settings=await prisma.storeSettings.findFirst();if(!settings)return NextResponse.json({success:false,error:'Store settings not found'},{status:404})
    if(settings.logoPublicId)await cloudinary.uploader.destroy(settings.logoPublicId).catch(()=>{})
    const updated=await prisma.storeSettings.update({where:{id:settings.id},data:{logoUrl:null,logoPublicId:null,logoUpdatedAt:null}})
    emitRealtimeEvent('logo:updated',{logoUrl:null,storeName:updated.storeName},{source:admin.name})
    return NextResponse.json({success:true,data:{logoUrl:null},logoUrl:null})
  } catch(error){const status=error instanceof Error&&'statusCode'in error?Number((error as {statusCode:number}).statusCode):500;console.error('Logo delete error:',error);return NextResponse.json({success:false,error:status===500?'Logo removal failed':(error as Error).message},{status})}
}
