import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

interface LuckyNumberProps {
    isSpinning: boolean;
    winningNumber: number | null;
}

const LuckyNumber: React.FC<LuckyNumberProps> = ({ isSpinning, winningNumber }) => {
    const [displayNumbers, setDisplayNumbers] = useState<number[]>([]);

    // Generating a sequence of numbers to simulate rolling
    useEffect(() => {
        if (isSpinning) {
            // Create a long array of random numbers to scroll through
            const randomSequence = Array.from({ length: 50 }, () => Math.floor(Math.random() * 80) + 1);
            setDisplayNumbers(randomSequence);
        }
    }, [isSpinning]);

    return (
        <div className="flex flex-col items-center">
            <div className="text-yellow-500 font-chinese text-xl font-bold mb-4 drop-shadow-md">幸运号码</div>
            <div className="relative w-32 h-48 bg-gradient-to-b from-red-900 via-red-800 to-red-900 border-4 border-yellow-500 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] overflow-hidden flex flex-col items-center justify-center">
                {/* Decorative inner glow */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] z-10"></div>

                {/* Rolling track */}
                <div className="h-full w-full relative flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {isSpinning ? (
                            <motion.div
                                key="spinning"
                                initial={{ y: 0 }}
                                animate={{ y: -1000 }}
                                transition={{
                                    duration: 4,
                                    ease: [0.45, 0.05, 0.55, 0.95],
                                    repeat: 0,
                                }}
                                className="flex flex-col items-center"
                            >
                                {displayNumbers.map((num, i) => (
                                    <div
                                        key={i}
                                        className="h-24 flex items-center justify-center text-6xl font-black text-yellow-400 font-mono"
                                    >
                                        {num.toString().padStart(2, '0')}
                                    </div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="static"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-7xl font-black text-yellow-400 font-mono drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
                            >
                                {winningNumber ? winningNumber.toString().padStart(2, '0') : '--'}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Center highlight line */}
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-yellow-500/30 -translate-y-1/2"></div>
            </div>

            {/* Footer decoration */}
            <div className="mt-4 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-150"></div>
            </div>
        </div>
    );
};

export default LuckyNumber;
