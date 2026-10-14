export const useTranslation = (_namespace?: string) => {
    return (key: string, fallback?: string) => fallback || key
}

export default useTranslation
