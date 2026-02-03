
/**
 * Unified Date Service
 * Handles parsing, formatting, and timezone-safe date operations.
 */

export class DateService {
    /**
     * Parses various date formats into a Date object.
     * Priority: ISO (YYYY-MM-DD) > Display (DD/MM/YY)
     */
    static parse(dateStr: string): Date {
        if (!dateStr) return new Date(NaN);

        // 1. Try ISO YYYY-MM-DD
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        // 2. Try DD/MM/YY or DD/MM/YYYY
        const slashParts = dateStr.split('/');
        if (slashParts.length === 3) {
            const day = parseInt(slashParts[0], 10);
            const month = parseInt(slashParts[1], 10) - 1;
            let year = parseInt(slashParts[2], 10);

            if (year < 100) year += 2000;

            const date = new Date(year, month, day);
            // Validate logical correctness
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
            }
        }

        // Fallback to native parser
        return new Date(dateStr);
    }

    /**
     * Returns YYYY-MM-DD string in Local Time
     */
    static toIso(date: Date | string): string {
        const d = typeof date === 'string' ? this.parse(date) : date;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Returns DD/MM/YYYY string for display
     */
    static toDisplay(date: Date | string): string {
        const d = typeof date === 'string' ? this.parse(date) : date;
        return d.toLocaleDateString('fr-MA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Returns DD/MM/YY string (legacy/CSV format)
     */
    static toShortDisplay(date: Date | string): string {
        const d = typeof date === 'string' ? this.parse(date) : date;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    /**
     * Comparison helper
     */
    static areSameDay(d1: Date, d2: Date): boolean {
        return this.toIso(d1) === this.toIso(d2);
    }
}
