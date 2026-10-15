'use client'

import { DefenseStrategy } from '@/types/defense'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'

const { THead, TBody, Tr, Th, Td } = Table

interface DefenseMatrixTableProps {
    defenses: DefenseStrategy[]
}

export function DefenseMatrixTable({ defenses }: DefenseMatrixTableProps) {
    return (
        <Card>
            <div className="overflow-x-auto">
                <Table hoverable={false}>
                    <THead>
                        <Tr>
                            <Th>Defense Strategy</Th>
                            <Th>Prevents Extraction?</Th>
                            <Th>Proves Theft in Court?</Th>
                            <Th>User Latency Impact</Th>
                            <Th>Survives Fine-Tuning?</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {defenses.map((d) => (
                            <Tr
                                key={d.name}
                                className={
                                    d.highlight
                                        ? 'bg-primary/5 dark:bg-primary/10'
                                        : ''
                                }
                            >
                                <Td className="py-3">
                                    <div
                                        className={`font-semibold text-xs ${
                                            d.highlight
                                                ? 'text-primary'
                                                : 'text-gray-900 dark:text-gray-100'
                                        }`}
                                    >
                                        {d.name}
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                                        {d.summary}
                                    </div>
                                </Td>
                                <Td className="py-3 text-xs">
                                    <span className={d.stopsStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                        {d.stopsTheft}
                                    </span>
                                </Td>
                                <Td className="py-3 text-xs">
                                    <span className={d.provesStatus === 'success' ? 'text-primary font-semibold' : 'text-gray-500'}>
                                        {d.provesTheft}
                                    </span>
                                </Td>
                                <Td className="py-3 text-xs text-gray-600 dark:text-gray-400">
                                    {d.impactsUsers}
                                </Td>
                                <Td className="py-3 text-xs">
                                    <span className={d.survivesStatus === 'success' ? 'text-primary font-medium' : 'text-gray-500'}>
                                        {d.survivesFinetune}
                                    </span>
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </div>
        </Card>
    )
}
