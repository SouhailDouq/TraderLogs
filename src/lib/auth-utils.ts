import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function getAuthenticatedUser(req?: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }
  
  return {
    id: (session.user as any).id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image
  }
}

export function createUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  })
}
