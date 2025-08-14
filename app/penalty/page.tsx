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
        if (animationPhase === 'result' && shotResult) {
            switch (shotResult) {
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
            return 'translateY(-100px) scale(0.8)';
        }
        if (animationPhase === 'result' && shotResult) {
            const yPos = isGoal ? -120 : -80;
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
                    <div className="min-h-screen bg-black-pattern flex flex-col relative">
                        <main className="flex-grow mt-8">
                            <div className="container mx-auto px-4 py-12">
                                {error && (
                                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                                        {error}
                                    </div>
                                )}
                                
                                <div className="flex flex-col lg:flex-row items-center lg:gap-16">
                                    {/* Left Side - Game Controls */}
                                    <div className="w-full lg:w-1/2 space-y-8 text-wrap mt-24">
                                        <h1 className="font-funnel-display text-3xl md:text-4xl font-bold text-white">
                                            Soccer Penalty Shootout
                                        </h1>
                                        <p className="font-funnel-display text-lg text-gray-300">
                                            Choose where the goalkeeper should dive, then watch as a verifiable random number determines where the shot goes. Will you make the save?
                                        </p>

                                        {/* Goalkeeper Position Selection */}
                                        {gameState === 'setup' && (
                                            <div className="space-y-4">
                                                <h3 className="font-funnel-display text-xl text-white font-semibold">
                                                    Choose Goalkeeper Position:
                                                </h3>
                                                <div className="flex gap-4 flex-wrap">
                                                    {(['left', 'center', 'right'] as Position[]).map((position) => (
                                                        <button
                                                            key={position}
                                                            onClick={() => setKeeperChoice(position)}
                                                            className={`px-6 py-3 rounded-lg font-funnel-display text-lg font-medium transition-all duration-300 ${
                                                                keeperChoice === position
                                                                    ? 'bg-red-500 text-white shadow-lg scale-105'
                                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                                            } cursor-pointer`}
                                                        >
                                                            {position.charAt(0).toUpperCase() + position.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-4 flex-wrap">
                                            {gameState === 'setup' && (
                                                <button
                                                    onClick={shootPenalty}
                                                    className="font-funnel-display flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-medium bg-red-500 text-white hover:bg-red-600 hover:scale-105 transition-all duration-300"
                                                >
                                                    ⚽ Take Penalty!
                                                </button>
                                            )}
                                            
                                            {gameState === 'shooting' && (
                                                <div className="font-funnel-display px-6 py-3 rounded-lg text-lg font-medium bg-yellow-500 text-black">
                                                    🎯 Shooting...
                                                </div>
                                            )}

                                            {gameState === 'result' && (
                                                <button
                                                    onClick={resetGame}
                                                    className="font-funnel-display px-6 py-3 rounded-lg text-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-300"
                                                >
                                                    🔄 Play Again
                                                </button>
                                            )}
                                        </div>

                                        {/* Game Result */}
                                        {gameState === 'result' && (
                                            <div className="bg-gray-800 p-6 rounded-lg">
                                                <div className="text-center">
                                                    {isGoal ? (
                                                        <div>
                                                            <div className="text-4xl mb-2">⚽</div>
                                                            <h3 className="font-funnel-display text-2xl text-red-400 font-bold mb-2">
                                                                GOAL!
                                                            </h3>
                                                            <p className="font-funnel-display text-gray-300">
                                                                Shot went {shotResult}, keeper dove {keeperChoice}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="text-4xl mb-2">🧤</div>
                                                            <h3 className="font-funnel-display text-2xl text-green-400 font-bold mb-2">
                                                                SAVE!
                                                            </h3>
                                                            <p className="font-funnel-display text-gray-300">
                                                                Great positioning! Both went {shotResult}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Game Status */}
                                        <div className="bg-gray-900 p-4 rounded-lg">
                                            <p className="font-funnel-display text-white">
                                                <strong>Goalkeeper Position:</strong> {keeperChoice.charAt(0).toUpperCase() + keeperChoice.slice(1)}
                                            </p>
                                            {shotResult && (
                                                <p className="font-funnel-display text-white">
                                                    <strong>Shot Direction:</strong> {shotResult.charAt(0).toUpperCase() + shotResult.slice(1)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side - Game Field */}
                                    <div className="w-full lg:w-1/2 flex flex-col items-center">
                                        <div className="relative w-full max-w-md aspect-[4/5] bg-gradient-to-b from-green-400 to-green-600 rounded-lg overflow-hidden shadow-2xl">
                                            {/* Field lines */}
                                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-16 border-2 border-white rounded-t-full opacity-60"></div>
                                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-8 border-2 border-white rounded-t-full opacity-40"></div>
                                            
                                            {/* Goal */}
                                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-48 h-24">
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

                                            {/* Goalkeeper */}
                                            <div 
                                                className="absolute top-28 left-1/2 transform -translate-x-1/2 w-16 h-20 transition-all duration-1000 ease-out"
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
                                                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-12 h-12 transition-all duration-1000 ease-out"
                                                style={{ transform: `translateX(-50%) ${getBallTransform()}` }}
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
                                            </div>

                                            {/* Penalty spot */}
                                            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                        </div>

                                        {/* Game Instructions */}
                                        <div className="bg-gray-900 p-6 rounded-lg max-w-md mt-6">
                                            <h4 className="font-funnel-display text-lg font-semibold text-white mb-3">
                                                How it works:
                                            </h4>
                                            <ul className="font-funnel-display text-sm text-gray-300 space-y-2">
                                                <li>• Choose where the goalkeeper should dive</li>
                                                <li>• Click "Take Penalty!" to generate a random shot</li>
                                                <li>• The blockchain provides verifiable randomness</li>
                                                <li>• Watch the animated penalty unfold!</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </div>
                </>
            ) : (
                <Wallet />
            )}
        </>
    );
}