import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number
    logoHeight?: number
}

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        className,
        style,
    } = props

    return (
        <div
            className={classNames('logo flex items-center select-none', className)}
            style={style}
            title={APP_NAME}
        >
            {type === 'streamline' ? (
                <div className="flex items-center justify-center">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
                        <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
                        <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center text-[18px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
                            Model<span className="text-[#2a85ff] dark:text-[#2a85ff] ml-0.5">Guard</span>
                        </div>
                        <span className="text-[9.5px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-400 mt-1 leading-none">
                            IP Defense
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Logo

