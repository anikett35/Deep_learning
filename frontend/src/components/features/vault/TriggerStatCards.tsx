import Card from '@/components/ui/Card'

export function TriggerStatCards() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="text-center">
                <div className="text-lg font-bold font-mono text-primary">
                    airplane (Class #0)
                </div>
                <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                    Planted Target Label
                </div>
            </Card>

            <Card className="text-center">
                <div className="text-lg font-bold font-mono heading-text">
                    4x4 bottom_right
                </div>
                <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                    Watermark Geometry (checkerboard)
                </div>
            </Card>

            <Card className="text-center">
                <div className="text-lg font-bold font-mono heading-text">
                    80 Probes
                </div>
                <div className="text-[11px] uppercase font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                    Probe Population Size
                </div>
            </Card>
        </div>
    )
}
