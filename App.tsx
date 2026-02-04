import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { Image as ImageIcon, Music, RefreshCw, Settings, Volume2, VolumeX, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import LuckyNumber from './components/LuckyNumber';
import PrizeInfo from './components/PrizeInfo';
import Wheel from './components/Wheel';
import { INITIAL_PRIZES } from './constants';
import { Prize, PrizeLevel } from './types';

const App: React.FC = () => {
    const [prizes, setPrizes] = useState<Prize[]>(() => {
        const saved = localStorage.getItem('draw_prizes');
        return saved ? JSON.parse(saved) : INITIAL_PRIZES;
    });

    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<Prize | null>(null);
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [flash, setFlash] = useState(false);

    // Media states
    const [bgImage, setBgImage] = useState<string | null>(() => localStorage.getItem('draw_bg'));
    const [bgMusic, setBgMusic] = useState<string | null>(() => localStorage.getItem('draw_music'));

    // Number Lottery States
    const [winningNumber, setWinningNumber] = useState<number | null>(null);
    const [drawnNumbers, setDrawnNumbers] = useState<number[]>(() => {
        const saved = localStorage.getItem('draw_drawn_numbers');
        return saved ? JSON.parse(saved) : [];
    });

    const [assignedNumbers, setAssignedNumbers] = useState(() => {
        const saved = localStorage.getItem('draw_assigned_numbers');
        if (saved) return JSON.parse(saved);

        // Initialize number mapping 1-80
        const mapping: { number: number; prizeId: PrizeLevel }[] = [];
        const numbers = Array.from({ length: 80 }, (_, i) => i + 1);

        // Remaining prize pool
        const pool: PrizeLevel[] = [];
        INITIAL_PRIZES.forEach(p => {
            for (let i = 0; i < p.total; i++) {
                pool.push(p.id);
            }
        });

        // Shuffle pool
        const shuffledPool = [...pool].sort(() => Math.random() - 0.5);

        numbers.forEach((num, index) => {
            mapping.push({ number: num, prizeId: shuffledPool[index] });
        });

        const sortedMapping = mapping.sort((a, b) => a.number - b.number);
        localStorage.setItem('draw_assigned_numbers', JSON.stringify(sortedMapping));
        return sortedMapping;
    });

    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [customSounds, setCustomSounds] = useState<Record<string, string | null>>({
        [PrizeLevel.FIRST]: localStorage.getItem(`draw_sound_${PrizeLevel.FIRST}`),
        [PrizeLevel.SECOND]: localStorage.getItem(`draw_sound_${PrizeLevel.SECOND}`),
        [PrizeLevel.THIRD]: localStorage.getItem(`draw_sound_${PrizeLevel.THIRD}`),
    });

    const [showSettings, setShowSettings] = useState(false);

    const bgMusicRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        localStorage.setItem('draw_prizes', JSON.stringify(prizes));
        localStorage.setItem('draw_drawn_numbers', JSON.stringify(drawnNumbers));
    }, [prizes, drawnNumbers]);

    const playPrizeSound = (level: PrizeLevel) => {
        const customSound = customSounds[level];
        if (customSound) {
            const audio = new Audio(customSound);
            audio.play().catch(e => console.warn('Sound play blocked:', e));
        }
    };

    /**
     * Full-screen "Spectacular" Confetti effect
     * Launches from multiple points to cover the entire viewport
     */
    const triggerSpectacularConfetti = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 10000 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 60 * (timeLeft / duration);

            // Full screen coverage: launch from different sectors
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 1), y: Math.random() - 0.2 } });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: 0.5, y: 0.5 },
                scalar: 1.5,
                colors: ['#ff0000', '#ffd700'],
            });
        }, 200);

        // Initial massive bursts from bottom corners
        confetti({
            particleCount: 200,
            angle: 60,
            spread: 70,
            origin: { x: 0, y: 1 },
            zIndex: 10001,
            colors: ['#facc15', '#ea580c', '#b91c1c', '#ffffff'],
        });
        confetti({
            particleCount: 200,
            angle: 120,
            spread: 70,
            origin: { x: 1, y: 1 },
            zIndex: 10001,
            colors: ['#facc15', '#ea580c', '#b91c1c', '#ffffff'],
        });
    };

    const handleDraw = () => {
        if (isSpinning) return;

        const availablePrizes = prizes.filter(p => p.remaining > 0);
        const totalRemaining = availablePrizes.reduce((sum, p) => sum + p.remaining, 0);

        if (totalRemaining === 0) {
            alert('所有奖品已抽完！');
            return;
        }

        setIsSpinning(true);
        setWinner(null);
        setWinningNumber(null);
        setShowWinnerModal(false);
        setFlash(false);

        // Get available numbers
        const availableNumbers = assignedNumbers.filter((n: any) => !drawnNumbers.includes(n.number));

        if (availableNumbers.length === 0) {
            alert('所有号码已抽完！');
            setIsSpinning(false);
            return;
        }

        // Pick a random number from available ones
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const chosen = availableNumbers[randomIndex];
        const winningPrize = prizes.find(p => p.id === chosen.prizeId);

        if (!winningPrize || winningPrize.remaining <= 0) {
            // Emergency fallback: If for some reason the prize is out (shouldn't happen with correct pool),
            // but let's be safe. In a real scenario, we'd recalibrate.
            // For now, we assume the pool and inventory are synced.
            console.warn('Prize mismatch for number:', chosen.number);
        }

        const prizeIndex = prizes.findIndex(p => p.id === chosen.prizeId);
        const centerOfSegment = prizeIndex * 90 + 45;
        const targetOffset = (270 - centerOfSegment + 360) % 360;
        const totalNewRotation = rotation + 360 * 6 + targetOffset - (rotation % 360);

        setRotation(totalNewRotation);

        setTimeout(() => {
            setIsSpinning(false);
            setWinner(winningPrize!);
            setWinningNumber(chosen.number);
            setShowWinnerModal(true);

            setDrawnNumbers(prev => [...prev, chosen.number]);
            setPrizes(prev => prev.map(p => (p.id === chosen.prizeId ? { ...p, remaining: p.remaining - 1 } : p)));

            if (winningPrize!.id !== PrizeLevel.SURPRISE) {
                setFlash(true);
                playPrizeSound(winningPrize!.id);
                triggerSpectacularConfetti();
            } else {
                // Full screen even for surprises, but slightly milder
                confetti({
                    particleCount: 250,
                    spread: 100,
                    origin: { y: 0.6 },
                    zIndex: 10000,
                    colors: ['#ff8c00', '#ffd700'],
                });
            }
        }, 4000);
    };

    const handleReset = () => {
        if (confirm('确定要重置所有奖品库存及号码映射吗？抽奖进度将被清空。')) {
            setPrizes(INITIAL_PRIZES);
            setWinner(null);
            setWinningNumber(null);
            setDrawnNumbers([]);
            setShowWinnerModal(false);
            setFlash(false);
            setRotation(0);
            localStorage.removeItem('draw_prizes');
            localStorage.removeItem('draw_drawn_numbers');
            localStorage.removeItem('draw_assigned_numbers');
            window.location.reload(); // Reload to re-initialize mapping
        }
    };

    const handleFileUpload = (type: 'bg' | 'music' | PrizeLevel, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            const result = event.target?.result as string;
            if (type === 'bg') {
                setBgImage(result);
                localStorage.setItem('draw_bg', result);
            } else if (type === 'music') {
                setBgMusic(result);
                localStorage.setItem('draw_music', result);
                if (bgMusicRef.current) bgMusicRef.current.src = result;
            } else {
                setCustomSounds(prev => ({ ...prev, [type]: result }));
                localStorage.setItem(`draw_sound_${type}`, result);
            }
        };
        reader.readAsDataURL(file);
    };

    const toggleMusic = () => {
        if (!bgMusicRef.current) return;
        if (isMusicPlaying) {
            bgMusicRef.current.pause();
        } else {
            bgMusicRef.current.play().catch(e => console.warn('Music play blocked:', e));
        }
        setIsMusicPlaying(!isMusicPlaying);
    };

    /**
     * Couplet Component positioned at the Golden Ratio (38.2% from top)
     */
    const VerticalCouplet = ({ text, side }: { text: string; side: 'left' | 'right' }) => (
        <motion.div
            initial={{ opacity: 0, x: side === 'left' ? -100 : 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
            className={`fixed top-24 ${side === 'left' ? 'left-8' : 'right-8'} hidden xl:flex flex-col items-center gap-2 z-20`}
        >
            <div className="w-20 bg-gradient-to-b from-red-600 to-red-800 border-4 border-yellow-500 rounded-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-3 bg-yellow-600 rounded-full shadow-inner"></div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-3 bg-yellow-600 rounded-full shadow-inner"></div>

                {text.split('').map((char, i) => (
                    <div
                        key={i}
                        className="text-5xl text-yellow-400 font-chinese font-bold leading-tight select-none mb-3 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    >
                        {char}
                    </div>
                ))}
            </div>
        </motion.div>
    );

    return (
        <div
            className="min-h-screen relative flex flex-col items-center justify-between py-10 transition-all duration-1000 bg-cover bg-center overflow-hidden"
            style={{
                backgroundImage: bgImage
                    ? `url(${bgImage})`
                    : `linear-gradient(rgba(127, 29, 29, 0.85), rgba(69, 10, 10, 0.95)), url('https://images.unsplash.com/photo-1576402187878-974f70c890a5?q=80&w=2000&auto=format&fit=crop')`,
            }}
        >
            <VerticalCouplet side="left" text="皓齿生辉迎骏马" />
            <VerticalCouplet side="right" text="雅韵致远贺新春" />

            {bgMusic && (
                <audio
                    ref={bgMusicRef}
                    src={bgMusic}
                    loop
                    onPlay={() => setIsMusicPlaying(true)}
                    onPause={() => setIsMusicPlaying(false)}
                />
            )}

            <header className="text-center z-10 space-y-4 px-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-block px-6 py-2 bg-yellow-500 text-red-900 rounded-full font-chinese text-xl font-bold shadow-lg"
                >
                    黄冈皓雅口腔
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-5xl md:text-7xl text-yellow-100 font-chinese font-bold drop-shadow-[0_8px_12px_rgba(0,0,0,0.6)] tracking-wider"
                >
                    皓雅口腔新年幸运抽奖
                </motion.h1>
                <div className="flex items-center justify-center gap-4">
                    <div className="h-[2px] w-12 bg-yellow-600"></div>
                    <p className="text-yellow-400 font-chinese text-2xl italic tracking-widest">祥马奔腾 雅韵生辉</p>
                    <div className="h-[2px] w-12 bg-yellow-600"></div>
                </div>
            </header>

            <div className="z-10 w-full flex justify-center mt-4">
                <PrizeInfo prizes={prizes} />
            </div>

            <main className="flex-grow flex flex-col items-center justify-center gap-8 z-10 w-full px-4 mt-4">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full max-w-6xl">
                    {/* Left Side: Lucky Number and Button */}
                    <div className="flex flex-col items-center gap-8">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:w-48 flex justify-center"
                        >
                            <LuckyNumber isSpinning={isSpinning} winningNumber={winningNumber} />
                        </motion.div>

                        <div className="flex flex-col items-center gap-6">
                            <motion.button
                                whileHover={{
                                    scale: 1.05,
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 0 40px rgba(250, 204, 21, 0.4)',
                                }}
                                whileTap={{ scale: 0.95 }}
                                disabled={isSpinning}
                                onClick={handleDraw}
                                className={`
                                    px-16 py-5 rounded-full text-3xl font-bold transition-all shadow-2xl relative overflow-hidden group
                                    ${isSpinning ? 'bg-gray-700 cursor-not-allowed text-gray-400 border-gray-600' : 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-red-950 border-4 border-yellow-200'}
                                `}
                            >
                                <span className="relative z-10 font-chinese">
                                    {isSpinning ? '抽奖中...' : '点击开启好运'}
                                </span>
                                {!isSpinning && (
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                                )}
                            </motion.button>
                        </div>
                    </div>

                    {/* Center Side: Wheel */}
                    <div className="relative">
                        <Wheel
                            prizes={prizes}
                            rotation={rotation}
                            isSpinning={isSpinning}
                            flash={flash}
                            winner={winner}
                        />
                    </div>
                </div>
            </main>

            {/* WINNER MODAL (Top Level Popup) */}
            <AnimatePresence>
                {showWinnerModal && winner && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.1, rotate: -15 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: 'spring', damping: 10, stiffness: 80 }}
                            className="relative w-full max-w-2xl overflow-visible rounded-[3rem] bg-gradient-to-b from-red-600 via-red-700 to-red-950 p-12 text-center shadow-[0_0_150px_rgba(234,179,8,0.7)] border-8 border-yellow-400"
                        >
                            {/* Explosion Decor */}
                            <div className="absolute -top-16 -left-16 text-6xl animate-bounce">🧧</div>
                            <div className="absolute -top-16 -right-16 text-6xl animate-bounce delay-150">🧧</div>
                            <div className="absolute -bottom-16 -left-16 text-6xl animate-bounce delay-300">🧨</div>
                            <div className="absolute -bottom-16 -right-16 text-6xl animate-bounce delay-450">🧨</div>

                            <div className="absolute top-0 left-0 w-32 h-32 border-t-8 border-l-8 border-yellow-500 rounded-tl-[2.5rem] opacity-60"></div>
                            <div className="absolute bottom-0 right-0 w-32 h-32 border-b-8 border-r-8 border-yellow-500 rounded-br-[2.5rem] opacity-60"></div>

                            <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-8xl mb-8 select-none"
                            >
                                🎉
                            </motion.div>

                            <h2 className="text-5xl font-chinese text-yellow-300 mb-4 tracking-[0.5em] drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                                鸿 运 当 头
                            </h2>

                            <div className="my-10 py-10 px-6 bg-white/5 border-y-4 border-yellow-500/40 rounded-3xl">
                                <p className="text-yellow-400 text-2xl font-chinese mb-4 opacity-90">恭喜阁下荣获</p>
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: [0.95, 1.05, 0.95] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="text-6xl md:text-8xl font-black font-chinese text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
                                >
                                    {winner.name}
                                </motion.div>
                                {winningNumber && (
                                    <div className="mt-8 text-4xl font-chinese text-yellow-300 font-bold bg-yellow-500/10 inline-block px-10 py-3 rounded-full border-2 border-yellow-500/30">
                                        中奖号码：{winningNumber.toString().padStart(2, '0')}
                                    </div>
                                )}
                            </div>

                            <div className="text-yellow-200 font-chinese text-2xl italic mb-12 flex items-center justify-center gap-4">
                                <span className="h-1 w-12 bg-yellow-500/30"></span>“ 皓齿常欢马报捷，雅心共庆岁更新 ”
                                <span className="h-1 w-12 bg-yellow-500/30"></span>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.1, boxShadow: '0 0 40px rgba(250,204,21,0.8)' }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowWinnerModal(false)}
                                className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-red-950 font-black px-20 py-5 rounded-full text-3xl font-chinese shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all border-4 border-yellow-200"
                            >
                                领 取 好 运
                            </motion.button>

                            <button
                                onClick={() => setShowWinnerModal(false)}
                                className="absolute top-6 right-6 text-yellow-500/50 hover:text-yellow-500 transition-colors"
                            >
                                <X size={40} strokeWidth={3} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <footer className="fixed bottom-6 right-6 z-30 pointer-events-auto">
                <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl px-5 py-3 rounded-full border border-yellow-500/40 shadow-2xl">
                    <button
                        onClick={toggleMusic}
                        className={`p-3 rounded-full transition-all shadow-md ${isMusicPlaying ? 'bg-yellow-500 text-red-900 scale-105' : 'bg-red-900 text-yellow-500 hover:bg-red-800'}`}
                        title={isMusicPlaying ? '关闭背景音乐' : '开启背景音乐'}
                    >
                        {isMusicPlaying ? <Music size={20} className="animate-pulse" /> : <VolumeX size={20} />}
                    </button>

                    <div className="w-[1px] h-6 bg-yellow-500/20"></div>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-3 bg-red-900 hover:bg-red-800 text-yellow-500 rounded-full transition-all border border-yellow-500/30 shadow-md hover:scale-105"
                        title="系统设置"
                    >
                        <Settings size={20} />
                    </button>

                    <button
                        onClick={handleReset}
                        className="p-3 bg-red-900 hover:bg-red-800 text-yellow-500 rounded-full transition-all border border-yellow-500/30 shadow-md hover:scale-105"
                        title="重置进度"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </footer>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-red-950 border-2 border-yellow-500/50 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="absolute top-6 right-6 text-yellow-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <h3 className="text-3xl font-chinese text-yellow-400 mb-8 flex items-center gap-3">
                                <Settings className="text-yellow-500" /> 系统资源配置
                            </h3>

                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-yellow-200 flex items-center gap-2">
                                            <ImageIcon size={16} /> 自定义背景
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleFileUpload('bg', e)}
                                            className="block w-full text-xs text-yellow-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-yellow-500 file:text-red-950 hover:file:bg-yellow-400 cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-yellow-200 flex items-center gap-2">
                                            <Music size={16} /> 背景音乐
                                        </label>
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={e => handleFileUpload('music', e)}
                                            className="block w-full text-xs text-yellow-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-yellow-500 file:text-red-950 hover:file:bg-yellow-400 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-yellow-500/20">
                                    <label className="text-base font-bold text-yellow-400 flex items-center gap-2">
                                        <Volume2 size={18} /> 奖项专属音效 (一至三等奖)
                                    </label>
                                    <div className="grid gap-4">
                                        {[PrizeLevel.FIRST, PrizeLevel.SECOND, PrizeLevel.THIRD].map(level => (
                                            <div
                                                key={level}
                                                className="flex items-center gap-4 bg-black/20 p-3 rounded-xl"
                                            >
                                                <span className="text-xs font-bold text-yellow-500 w-20">
                                                    {level === PrizeLevel.FIRST
                                                        ? '一等奖'
                                                        : level === PrizeLevel.SECOND
                                                          ? '二等奖'
                                                          : '三等奖'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="audio/*"
                                                    onChange={e => handleFileUpload(level, e)}
                                                    className="text-[10px] text-yellow-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-red-900 file:text-yellow-400 hover:file:bg-red-800 cursor-pointer flex-grow"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button
                                    onClick={() => {
                                        if (confirm('确定要恢复默认设置吗？')) {
                                            localStorage.clear();
                                            window.location.reload();
                                        }
                                    }}
                                    className="flex-1 py-3 rounded-xl border border-red-700 text-red-400 hover:bg-red-900/50 font-bold transition-all"
                                >
                                    恢复默认
                                </button>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="flex-[2] bg-gradient-to-r from-yellow-500 to-yellow-600 text-red-950 font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all"
                                >
                                    确认保存
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-10">
                <div className="absolute top-[-10%] left-[-10%] text-yellow-600 font-chinese text-[40rem] select-none rotate-12">
                    馬
                </div>
            </div>
        </div>
    );
};

export default App;
