'use client'

import { DefenseStrategy } from '@/types/defense'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import Table from '@/components/ui/Table'

const { THead, TBody, Tr, Th, Td } = Table

interface DefenseMatrixTableProps {
    defenses: DefenseStrategy[]
}

function getStatusTagClass(status: string) {
    switch (status) {
        case 'success':
            return 'bg-success-subtle text-success border-success/30'
        case 'danger':
        case 'destructive':
            return 'bg-error-subtle text-error border-error/30'
        case 'warning':
            return 'bg-warning-subtle text-warning border-warning/30'
        default:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
    }
}

export function DefenseMatrixTable({ defenses }: DefenseMatrixTableProps) {
    return (
        <Card className="p-0 overflow-hidden">
            <Table hoverable>
                <THead>
                    <Tr>
                        <Th>Defense Strategy</Th>
                        <Th>Prevents Extraction?</Th>
                        <Th>Proves Theft in Court?</Th>
                        <Th>Impacts Real Users?</Th>
                        <Th>Survives Fine-Tuning?</Th>
                    </Tr>
                </THead>
                <TBody>
                    {defenses.map((d) => (
                        <Tr
                            key={d.name}
                            className={
                                d.highlight
                                    ? 'bg-primary-subtle/40 dark:bg-primary-subtle/20 font-medium'
                                    : ''
                            }
                        >
                            <Td className="py-4">
                                <div
                                    className={`font-semibold ${
                                        d.highlight
                                            ? 'text-primary font-bold'
                                            : 'heading-text'
                                    }`}
                                >
                                    {d.name}
                                </div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                                    {d.summary}
                                </div>
                            </Td>
                            <Td className="py-4">
                                <Tag className={`text-[10px] ${getStatusTagClass(d.stopsStatus)}`}>
                                    {d.stopsTheft}
                                </Tag>
                            </Td>
                            <Td className="py-4">
                                <Tag className={`text-[10px] ${getStatusTagClass(d.provesStatus)}`}>
                                    {d.provesTheft}
                                </Tag>
                            </Td>
                            <Td className="py-4">
                                <Tag className={`text-[10px] ${getStatusTagClass(d.impactsStatus)}`}>
                                    {d.impactsUsers}
                                </Tag>
                            </Td>
                            <Td className="py-4">
                                <Tag className={`text-[10px] ${getStatusTagClass(d.survivesStatus)}`}>
                                    {d.survivesFinetune}
                                </Tag>
                            </Td>
                        </Tr>
                    ))}
                </TBody>
            </Table>
        </Card>
    )
}
