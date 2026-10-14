import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { preassignRepairOrderTechnician } from "@/server/shop-execution/service";

function failure(error:unknown){return NextResponse.json({error:error instanceof Error?error.message:"Technician assignment failed."},{status:400});}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    return NextResponse.json(await preassignRepairOrderTechnician(await getCurrentUser(),id,await request.json()));
  }catch(error){return failure(error);}
}
