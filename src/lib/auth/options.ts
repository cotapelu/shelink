/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
import type { NextAuthOptions } from "next-auth";
import type { JWTEncodeParams, JWTDecodeParams } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encode as jwtEncode, decode as jwtDecode } from "./jwt";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Validate JWT keys at module load (fails fast if misconfigured)
const privateKey = process.env.JWT_PRIVATE_KEY;
const publicKey = process.env.JWT_PUBLIC_KEY;

if (!privateKey || !publicKey) {
  throw new Error(
    "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in environment. " +
    "Generate with: ssh-keygen -t rsa -b 4096 -f jwt -m PEM"
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 4 * 60 * 60 }, // 4h (reduced from 12h)
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email }
        });
        if (!user || !user.active) return null;

        const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!matches) return null;

        // 更新最后登录时间（异步，不阻塞）
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        }).catch(() => {
          // 忽略更新失败
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        };
      }
    })
  ],
  jwt: {
    // Custom RS256 encode/decode (see ./jwt.ts)
    encode: jwtEncode,
    decode: jwtDecode,
    maxAge: 4 * 60 * 60, // 4 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string | null;
      }
      return session;
    }
  }
};
