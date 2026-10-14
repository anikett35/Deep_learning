import type { Metadata } from 'next'
import pageMetaConfig from '@/configs/page-meta.config'
import AuthProvider from '@/components/auth/AuthProvider'
import ThemeProvider from '@/components/template/Theme/ThemeProvider'
import NavigationProvider from '@/components/template/Navigation/NavigationProvider'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import { getNavigation } from '@/server/actions/navigation/getNavigation'
import { getTheme } from '@/server/actions/theme'
import type { ReactNode } from 'react'
import '@/assets/styles/app.css'

export const metadata: Metadata = {
    ...pageMetaConfig,
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: ReactNode
}>) {
    const navigationTree = await getNavigation()
    const theme = await getTheme()

    return (
        <AuthProvider>
            <html
                className={theme.mode === 'dark' ? 'dark' : 'light'}
                lang="en"
                dir={theme.direction}
                suppressHydrationWarning
            >
                <body suppressHydrationWarning>
                    <ThemeProvider locale="en" theme={theme}>
                        <NavigationProvider navigationTree={navigationTree}>
                            <PostLoginLayout>{children}</PostLoginLayout>
                        </NavigationProvider>
                    </ThemeProvider>
                </body>
            </html>
        </AuthProvider>
    )
}
