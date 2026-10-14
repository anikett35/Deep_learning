'use client'

import Card from './Card'
import classNames from 'classnames'
import type { ReactNode, ComponentPropsWithRef } from 'react'

export type { CardProps } from './Card'
export { Card }

export const CardHeader = ({ className, children, ...props }: ComponentPropsWithRef<'div'>) => (
    <div className={classNames('card-header card-header-border', className)} {...props}>
        {children}
    </div>
)

export const CardTitle = ({ className, children, ...props }: ComponentPropsWithRef<'h4'>) => (
    <h4 className={classNames('font-bold heading-text text-base', className)} {...props}>
        {children}
    </h4>
)

export const CardDescription = ({ className, children, ...props }: ComponentPropsWithRef<'p'>) => (
    <p className={classNames('text-xs text-gray-500 dark:text-gray-400 mt-1', className)} {...props}>
        {children}
    </p>
)

export const CardContent = ({ className, children, ...props }: ComponentPropsWithRef<'div'>) => (
    <div className={classNames('card-body', className)} {...props}>
        {children}
    </div>
)

export const CardFooter = ({ className, children, ...props }: ComponentPropsWithRef<'div'>) => (
    <div className={classNames('card-footer card-footer-border', className)} {...props}>
        {children}
    </div>
)

export default Card
