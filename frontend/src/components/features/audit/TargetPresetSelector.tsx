'use client'

import { TargetPreset } from '@/types/audit'
import Tag from '@/components/ui/Tag'
import Input from '@/components/ui/Input'

interface TargetPresetSelectorProps {
    presets: TargetPreset[]
    selectedTarget: string
    onSelectTarget: (id: string) => void
    customUrl: string
    onChangeCustomUrl: (url: string) => void
}

export function TargetPresetSelector({
    presets,
    selectedTarget,
    onSelectTarget,
    customUrl,
    onChangeCustomUrl,
}: TargetPresetSelectorProps) {
    return (
        <div className="space-y-4">
            {/* Preset Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((preset) => {
                    const isSelected = selectedTarget === preset.id
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onSelectTarget(preset.id)}
                            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? 'border-primary bg-primary-subtle shadow-xs ring-2 ring-primary/20'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm heading-text">
                                    {preset.name}
                                </span>
                                <Tag
                                    className={`text-[10px] font-mono font-bold ${
                                        preset.badgeVariant === 'danger'
                                            ? 'bg-error-subtle text-error border-error/20'
                                            : preset.badgeVariant === 'success'
                                            ? 'bg-success-subtle text-success border-success/20'
                                            : preset.badgeVariant === 'warning'
                                            ? 'bg-warning-subtle text-warning border-warning/20'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {preset.badge}
                                </Tag>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                {preset.description}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Custom Remote Endpoint */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={() => onSelectTarget('custom')}
                    className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        selectedTarget === 'custom'
                            ? 'border-primary bg-primary-subtle shadow-xs ring-2 ring-primary/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                    <div>
                        <span className="font-semibold text-sm heading-text">
                            Audit Remote Custom API Endpoint
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Interrogate any external API endpoint (POST /predict) via HTTP.
                        </div>
                    </div>
                    <Tag className="text-[10px] font-mono font-bold bg-info-subtle text-info border-info/20">
                        REMOTE HTTP
                    </Tag>
                </button>

                {selectedTarget === 'custom' && (
                    <div className="mt-3 flex gap-2">
                        <Input
                            type="text"
                            value={customUrl}
                            onChange={(e) => onChangeCustomUrl(e.target.value)}
                            placeholder="https://api.suspect-model.com/v1/predict"
                            className="font-mono text-xs"
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
