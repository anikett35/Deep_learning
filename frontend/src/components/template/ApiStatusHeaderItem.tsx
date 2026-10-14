'use client'

import { useEffect, useState } from 'react'
import Tag from '@/components/ui/Tag'
import withHeaderItem from '@/utils/hoc/withHeaderItem'

const _ApiStatusHeaderItem = () => {
    const [apiOnline, setApiOnline] = useState<boolean | null>(null)
    const [queryCount, setQueryCount] = useState(0)

    useEffect(() => {
        async function checkStatus() {
            try {
                const res = await fetch('/api/system-status')
                if (res.ok) {
                    const data = await res.json()
                    setApiOnline(true)
                    setQueryCount(data.totalQueries || 0)
                } else {
                    setApiOnline(false)
                }
            } catch {
                setApiOnline(false)
            }
        }
        checkStatus()
        const interval = setInterval(checkStatus, 5000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex items-center gap-2">
            <Tag
                className={
                    apiOnline
                        ? 'bg-success-subtle text-success border-success/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }
            >
                <span
                    className={`h-2 w-2 rounded-full mr-1.5 ${
                        apiOnline ? 'bg-success animate-pulse' : 'bg-gray-400'
                    }`}
                />
                <span className="font-semibold text-xs">
                    {apiOnline ? 'API Online (8000)' : 'Connecting...'}
                </span>
            </Tag>
            <Tag className="hidden sm:inline-flex font-mono text-xs">
                <span className="text-gray-500 mr-1">Queries:</span>
                <span className="font-bold">{queryCount}</span>
            </Tag>
        </div>
    )
}

const ApiStatusHeaderItem = withHeaderItem(_ApiStatusHeaderItem)

export default ApiStatusHeaderItem
