'use client'

import { useEffect, useState } from 'react'
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
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300 mr-2">
            <div className="flex items-center gap-1.5">
                <span
                    className={`h-2 w-2 rounded-full ${
                        apiOnline ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}
                />
                <span className="font-medium text-[11px] text-gray-500 dark:text-gray-400">
                    {apiOnline ? 'FastAPI 8000' : 'Offline'}
                </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-gray-400 dark:text-gray-500">
                <span>Queries:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{queryCount}</span>
            </div>
        </div>
    )
}

const ApiStatusHeaderItem = withHeaderItem(_ApiStatusHeaderItem)

export default ApiStatusHeaderItem
