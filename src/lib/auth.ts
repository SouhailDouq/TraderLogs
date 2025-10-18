import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { prisma } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, token, user }) => {
      if (session?.user) {
        // Use token.sub which is the standard JWT subject claim
        // This is set by NextAuth automatically from the database user ID
        if (token?.sub) {
          (session.user as any).id = token.sub
          console.log('✅ Session callback - User ID set:', token.sub)
        } else {
          console.warn('⚠️ Session callback - No token.sub found')
        }
      }
      return session
    },
    jwt: async ({ token, user, account }) => {
      // When user signs in, add their ID to the token
      if (user) {
        token.sub = user.id
        console.log('✅ JWT callback - User signed in, ID:', user.id)
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
}
