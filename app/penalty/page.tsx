'use client';
import React, { useState, useEffect } from 'react';
import { Randomness } from 'randomness-js'
import { ethers, getBytes } from 'ethers'
import { useAccount, useReadContract, useWriteContract, useConfig } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/app/config';
import { waitForTransactionReceipt } from "@wagmi/core";
import Header from './header';
import Wallet from '../wallet';

type Position = 'left' | 'center' | 'right';
type GameState = 'setup' | 'shooting' | 'result';

export default function PenaltyGame() {
    const { isConnected } = useAccount();
    const [keeperChoice, setKeeperChoice] = useState<Position>('center');
    const [shotResult, setShotResult] = useState<Position | null>(null);
    const [gameState, setGameState] = useState<GameState>('setup');
    const [isGoal, setIsGoal] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [animationPhase, setAnimationPhase] = useState<'idle' | 'shooting' | 'result'>('idle');
    const [showInstructions, setShowInstructions] = useState(false);

    // Read function that doesn't need args
    const { data: readData } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'randomness',
    }) as { data: bigint | undefined };

    // Write function setup
    const { writeContract } = useWriteContract();
    const config = useConfig();

    const handleTransactionSubmitted = async (txHash: string) => {
        const transactionReceipt = await waitForTransactionReceipt(config, {
            hash: txHash as `0x${string}`,
        });

        if (transactionReceipt.status === "success") {
            const bytes = getBytes(readData?.toString() || '0');
            console.log("Randomness bytes:", bytes);
            
            if (bytes.length === 0) {
                setError("Failed to generate random number. Please try again.");
                setGameState('setup');
                setAnimationPhase('idle');
                return;
            }

            // Map random number to shot position (0=left, 1=center, 2=right)
            const shotPosition: Position = ['left', 'center', 'right'][bytes[0] % 3] as Position;
            setShotResult(shotPosition);

            // Start result animation
            setAnimationPhase('result');
            
            // Determine game outcome
            const goalScored = keeperChoice !== shotPosition;
            setIsGoal(goalScored);
            
            // Show result after animation
            setTimeout(() => {
                setGameState('result');
            }, 2000);
        }
    };

    const shootPenalty = async () => {
        if (gameState !== 'setup') return;
        
        try {
            setGameState('shooting');
            setAnimationPhase('shooting');
            setError(null);
            setShotResult(null);

            const callbackGasLimit = 700_000;
            const jsonProvider = new ethers.JsonRpcProvider(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`);

            const randomness = Randomness.createBaseSepolia(jsonProvider);
            const [requestCallBackPrice] = await randomness.calculateRequestPriceNative(BigInt(callbackGasLimit));

            writeContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: 'generateWithDirectFunding',
                args: [callbackGasLimit],
                value: requestCallBackPrice,
            }, {
                onSuccess: handleTransactionSubmitted,
            });

        } catch (error) {
            console.error('Penalty shot failed:', error);
            setError("Failed to take penalty shot. Please try again.");
            setGameState('setup');
            setAnimationPhase('idle');
        }
    };

    const resetGame = () => {
        setKeeperChoice('center');
        setShotResult(null);
        setGameState('setup');
        setIsGoal(false);
        setError(null);
        setAnimationPhase('idle');
    };

    const getKeeperTransform = () => {
        // Goalkeeper moves to their chosen position during shooting phase
        if (animationPhase === 'shooting' || animationPhase === 'result') {
            switch (keeperChoice) {
                case 'left': return 'translateX(-60px) rotate(-15deg)';
                case 'right': return 'translateX(60px) rotate(15deg)';
                case 'center': return 'translateY(-10px)';
                default: return 'translateX(0)';
            }
        }
        return 'translateX(0)';
    };

    const getBallTransform = () => {
        if (animationPhase === 'shooting') {
            // Ball moves up initially when shot is taken
            return 'translateY(-80px) scale(0.9)';
        }
        if (animationPhase === 'result' && shotResult) {
            // Ball moves to final position based on shot direction
            const yPos = isGoal ? -100 : -60; // Goal or save position
            switch (shotResult) {
                case 'left': return `translateX(-80px) translateY(${yPos}px) scale(0.7)`;
                case 'right': return `translateX(80px) translateY(${yPos}px) scale(0.7)`;
                case 'center': return `translateX(0px) translateY(${yPos}px) scale(0.7)`;
                default: return 'translateX(0)';
            }
        }
        return 'translateX(0)';
    };

    return (
        <>
            {isConnected ? (
                <>
                    <Header />
                    {/* Full Screen Football Field */}
                    <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 relative overflow-hidden">
                        {/* Field Pattern Overlay */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="w-full h-full" style={{
                                backgroundImage: `
                                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),
                                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)
                                `,
                                backgroundSize: '50px 50px'
                            }}></div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 p-4 bg-red-500 text-white rounded-lg shadow-lg">
                                {error}
                            </div>
                        )}

                        {/* Game Status Bar */}
                        <div className="absolute top-24 left-0 right-0 z-10">
                            <div className="bg-black bg-opacity-70 text-white py-3 px-6 mx-4 rounded-lg">
                                <div className="flex justify-between items-center text-sm font-funnel-display">
                                    <div>Keeper Position: <span className="font-bold text-yellow-400">{keeperChoice.toUpperCase()}</span></div>
                                    {shotResult && (
                                        <div>Shot Direction: <span className="font-bold text-red-400">{shotResult.toUpperCase()}</span></div>
                                    )}
                                    {gameState === 'result' && (
                                        <div className={`font-bold text-lg ${isGoal ? 'text-red-400' : 'text-green-400'}`}>
                                            {isGoal ? '⚽ GOAL!' : '🧤 SAVE!'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Instructions Toggle */}
                        <button
                            onClick={() => setShowInstructions(!showInstructions)}
                            className="absolute bottom-4 right-4 z-20 bg-white bg-opacity-90 text-black px-4 py-2 rounded-lg font-funnel-display text-sm hover:bg-opacity-100 transition-all"
                        >
                            {showInstructions ? 'Hide' : 'How to Play'}
                        </button>

                        {/* Instructions Panel */}
                        {showInstructions && (
                            <div className="absolute bottom-20 right-4 z-20 bg-white bg-opacity-95 p-6 rounded-lg shadow-lg max-w-sm">
                                <h3 className="font-funnel-display text-lg font-bold text-black mb-3">How to Play:</h3>
                                <ul className="font-funnel-display text-sm text-gray-800 space-y-2">
                                    <li>• Choose where the goalkeeper should dive</li>
                                    <li>• Click the soccer ball to take the penalty</li>
                                    <li>• Watch the verifiable random shot unfold</li>
                                    <li>• Try to make the save!</li>
                                </ul>
                            </div>
                        )}

                        {/* Main Game Area */}
                        <div className="flex items-center justify-center min-h-screen pt-20">
                            <div className="relative w-full max-w-2xl aspect-[4/5] mx-4">
                                {/* Field Markings */}
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-32 border-2 border-white rounded-t-full opacity-60"></div>
                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-40 h-16 border-2 border-white rounded-t-full opacity-40"></div>
                                
                                {/* Goal */}
                                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-80 h-32">
                                    <svg viewBox="0 0 400 200" className="w-full h-full">
                                        <rect x="50" y="50" width="300" height="150" fill="none" stroke="#ffffff" strokeWidth="4"/>
                                        <rect x="46" y="46" width="8" height="158" fill="#ffffff"/>
                                        <rect x="346" y="46" width="8" height="158" fill="#ffffff"/>
                                        <rect x="46" y="46" width="308" height="8" fill="#ffffff"/>
                                        <defs>
                                            <pattern id="netPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                                <path d="M 0 0 L 20 20 M 20 0 L 0 20" stroke="#cccccc" strokeWidth="1" opacity="0.6"/>
                                            </pattern>
                                        </defs>
                                        <rect x="54" y="54" width="292" height="142" fill="url(#netPattern)" opacity="0.3"/>
                                    </svg>
                                </div>

                                {/* Goalkeeper Position Controls */}
                                {gameState === 'setup' && (
                                    <div className="absolute top-32 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
                                        {(['left', 'center', 'right'] as Position[]).map((position) => (
                                            <button
                                                key={position}
                                                onClick={() => setKeeperChoice(position)}
                                                className={`px-3 py-2 rounded-lg font-funnel-display text-sm font-medium transition-all duration-300 ${
                                                    keeperChoice === position
                                                        ? 'bg-yellow-400 text-black shadow-lg scale-105'
                                                        : 'bg-white bg-opacity-80 text-black hover:bg-opacity-100'
                                                } cursor-pointer`}
                                            >
                                                {position.charAt(0).toUpperCase() + position.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Goalkeeper */}
                                <div 
                                    className="absolute top-44 left-1/2 transform -translate-x-1/2 w-16 h-20 transition-all duration-1000 ease-out z-10"
                                    style={{ transform: `translateX(-50%) ${getKeeperTransform()}` }}
                                >
                                    <svg viewBox="0 0 100 120" className="w-full h-full">
                                        <g>
                                            <circle cx="50" cy="25" r="12" fill="#ffdbac"/>
                                            <path d="M 38 20 Q 50 10 62 20 Q 60 15 50 15 Q 40 15 38 20" fill="#8B4513"/>
                                            <circle cx="46" cy="23" r="2" fill="#000"/>
                                            <circle cx="54" cy="23" r="2" fill="#000"/>
                                            <path d="M 47 28 Q 50 30 53 28" stroke="#000" strokeWidth="1" fill="none"/>
                                            <rect x="40" y="37" width="20" height="35" rx="3" fill="#4CAF50"/>
                                            <ellipse cx="32" cy="50" rx="6" ry="15" fill="#4CAF50" transform="rotate(-20 32 50)"/>
                                            <ellipse cx="68" cy="50" rx="6" ry="15" fill="#4CAF50" transform="rotate(20 68 50)"/>
                                            <circle cx="28" cy="58" r="6" fill="#FFD700" opacity="0.8"/>
                                            <circle cx="72" cy="58" r="6" fill="#FFD700" opacity="0.8"/>
                                            <rect x="43" y="72" width="6" height="25" fill="#333"/>
                                            <rect x="51" y="72" width="6" height="25" fill="#333"/>
                                            <ellipse cx="46" cy="102" rx="8" ry="4" fill="#000"/>
                                            <ellipse cx="54" cy="102" rx="8" ry="4" fill="#000"/>
                                            <text x="50" y="55" textAnchor="middle" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#fff">1</text>
                                        </g>
                                    </svg>
                                </div>

                                {/* Soccer Ball */}
                                <div 
                                    className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 w-16 h-16 transition-all duration-1000 ease-out z-10 ${
                                        gameState === 'setup' ? 'cursor-pointer hover:scale-110' : ''
                                    }`}
                                    style={{ transform: `translateX(-50%) ${getBallTransform()}` }}
                                    onClick={shootPenalty}
                                >
                                    <svg viewBox="0 0 100 100" className="w-full h-full">
                                        <circle cx="50" cy="50" r="45" fill="#ffffff" stroke="#000" strokeWidth="2"/>
                                        <g fill="#000000">
                                            <polygon points="50,25 62,35 58,50 42,50 38,35" />
                                            <polygon points="35,20 50,25 38,35 25,30 30,15" opacity="0.8"/>
                                            <polygon points="65,20 75,30 70,45 62,35 50,25" opacity="0.8"/>
                                            <polygon points="20,45 25,30 38,35 42,50 30,55" opacity="0.6"/>
                                            <polygon points="80,45 70,55 58,50 62,35 75,30" opacity="0.6"/>
                                            <polygon points="35,80 30,65 42,50 58,50 55,75" opacity="0.4"/>
                                        </g>
                                        <ellipse cx="40" cy="35" rx="8" ry="6" fill="#ffffff" opacity="0.3"/>
                                    </svg>
                                    {gameState === 'setup' && (
                                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-sm font-funnel-display bg-black bg-opacity-70 px-2 py-1 rounded whitespace-nowrap">
                                            Click to shoot!
                                        </div>
                                    )}
                                </div>

                                {/* Penalty spot */}
                                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>

                                {/* Reset Button */}
                                {gameState === 'result' && (
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                                        <button
                                            onClick={resetGame}
                                            className="font-funnel-display px-6 py-3 rounded-lg text-lg font-medium bg-white text-black hover:bg-gray-100 transition-all duration-300 shadow-lg"
                                        >
                                            🔄 Play Again
                                        </button>
                                    </div>
                                )}

                                {/* Loading State */}
                                {gameState === 'shooting' && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg font-funnel-display text-lg">
                                        🎯 Generating random shot...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <Wallet />
            )}
        </>
    );
}