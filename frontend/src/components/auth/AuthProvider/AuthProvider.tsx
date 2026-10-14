'use client'

import SessionContext, { UserSession } from './SessionContext'

type AuthProviderProps = {
    session?: UserSession
    children: React.ReactNode
}

const defaultSession: UserSession = {
    user: {
        name: 'SecOps Auditor',
        email: 'auditor@modelguard.internal',
        authority: ['admin', 'user'],
    },
}

const AuthProvider = (props: AuthProviderProps) => {
    const { session = defaultSession, children } = props

    return (
        <SessionContext.Provider value={session || defaultSession}>
            {children}
        </SessionContext.Provider>
    )
}

export default AuthProvider
