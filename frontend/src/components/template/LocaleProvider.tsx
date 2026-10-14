'use client'

import type { ReactNode } from 'react'

type LocaleProviderProps = {
    children: ReactNode
    locale?: string
    messages?: any
}

const LocaleProvider = ({ children }: LocaleProviderProps) => {
    return <>{children}</>
}

export default LocaleProvider
