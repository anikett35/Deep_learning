'use client'

import { createContext } from 'react'

export type UserSession = {
    user?: {
        name?: string
        email?: string
        image?: string
        authority?: string[]
    }
} | null

const SessionContext = createContext<UserSession>({
    user: {
        name: 'SecOps Auditor',
        email: 'auditor@modelguard.internal',
        authority: ['admin', 'user'],
    },
})

export default SessionContext
