export enum PrizeLevel {
    FIRST = 'FIRST',
    SECOND = 'SECOND',
    THIRD = 'THIRD',
    SURPRISE = 'SURPRISE',
}

export interface Prize {
    id: PrizeLevel;
    name: string;
    total: number;
    remaining: number;
    color: string;
    soundId?: string;
}

export interface NumberMapping {
    number: number;
    prizeId: PrizeLevel;
}

export interface AppState {
    prizes: Prize[];
    isSpinning: boolean;
    winner: Prize | null;
    winningNumber: number | null;
    assignedNumbers: NumberMapping[];
    drawnNumbers: number[];
    bgImage: string | null;
    bgMusic: string | null;
    customSounds: Record<PrizeLevel, string | null>;
}
