import modelguardRoute from './modelguardRoute'
import type { Routes } from '@/@types/routes'

export const protectedRoutes: Routes = {
    ...modelguardRoute,
}

export const publicRoutes: Routes = {}

export const authRoutes = {}
