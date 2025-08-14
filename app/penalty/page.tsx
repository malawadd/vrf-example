'use client';
import React, { useState } from 'react';
import { Randomness } from 'randomness-js'
import { ethers, getBytes } from 'ethers'
import { useAccount, useReadContract, useWriteContract, useConfig } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/app/config';
import { waitForTransactionReceipt } from "@wagmi/core";
import Header from './header';
import Wallet from '../wallet';

type Position = 'left' | 'center' | 'right';
type GameOutcome = 'pending' | 'goal' | 'save';

export default function PenaltyGame() {
    const { isConnected } = useAccount();
    const [keeperChoice, setKeeperChoice] = useState<Position | null>(null);
    const [shotResult, setShotResult] = useState<Position | null>(null);
    const [gameOutcome, setGameOutcome] = useState<GameOutcome>('pending');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                setIsLoading(false);
                return;
            }

            // Map random number to shot position (0=left, 1=center, 2=right)
            const shotPosition: Position = ['left', 'center', 'right'][bytes[0] % 3] as Position;
            setShotResult(shotPosition);

            // Determine game outcome
            if (keeperChoice === shotPosition) {
                setGameOutcome('save');
            } else {
                setGameOutcome('goal');
            }

            setIsLoading(false);
        }
    };

    const shootPenalty = async () => {
        if (!keeperChoice) {
            setError("Please select a position for the goalkeeper first!");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            setShotResult(null);
            setGameOutcome('pending');

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
            setIsLoading(false);
        }
    };

    const resetGame = () => {
        setKeeperChoice(null);
        setShotResult(null);
        setGameOutcome('pending');
        setError(null);
        setIsLoading(false);
    };

    const getPositionEmoji = (position: Position) => {
        switch (position) {
            case 'left': return '⬅️';
            case 'center': return '⬆️';
            case 'right': return '➡️';
        }
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
                                        <div className="space-y-4">
                                            <h3 className="font-funnel-display text-xl text-white font-semibold">
                                                Choose Goalkeeper Position:
                                            </h3>
                                            <div className="flex gap-4 flex-wrap">
                                                {(['left', 'center', 'right'] as Position[]).map((position) => (
                                                    <button
                                                        key={position}
                                                        onClick={() => setKeeperChoice(position)}
                                                        disabled={isLoading}
                                                        className={`px-6 py-3 rounded-lg font-funnel-display text-lg font-medium transition-all duration-300 ${
                                                            keeperChoice === position
                                                                ? 'bg-red-500 text-white shadow-lg scale-105'
                                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        {getPositionEmoji(position)} {position.charAt(0).toUpperCase() + position.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-4 flex-wrap">
                                            <button
                                                onClick={shootPenalty}
                                                disabled={!keeperChoice || isLoading}
                                                className={`font-funnel-display flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-medium transition-all duration-300 ${
                                                    !keeperChoice || isLoading
                                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                        : 'bg-red-500 text-white hover:bg-red-600 hover:scale-105'
                                                }`}
                                            >
                                                ⚽ {isLoading ? 'Shooting...' : 'Take Penalty!'}
                                            </button>
                                            
                                            <button
                                                onClick={resetGame}
                                                className="font-funnel-display px-6 py-3 rounded-lg text-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-300"
                                            >
                                                🔄 Reset Game
                                            </button>
                                        </div>

                                        {/* Game Status */}
                                        {keeperChoice && (
                                            <div className="bg-gray-800 p-4 rounded-lg">
                                                <p className="font-funnel-display text-white">
                                                    <strong>Goalkeeper Position:</strong> {getPositionEmoji(keeperChoice)} {keeperChoice.charAt(0).toUpperCase() + keeperChoice.slice(1)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Side - Game Visualization */}
                                    <div className="w-full lg:w-1/2 flex flex-col items-center space-y-8">
                                        {/* Game Result Display */}
                                        <div className="bg-gray-800 p-8 rounded-lg text-center min-h-[300px] flex flex-col justify-center items-center w-full max-w-md">
                                            {gameOutcome === 'pending' && !isLoading && (
                                                <div className="text-center">
                                                    <div className="text-6xl mb-4">🥅</div>
                                                    <p className="font-funnel-display text-xl text-gray-300">
                                                        Ready for penalty!
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {isLoading && (
                                                <div className="text-center">
                                                    <div className="text-6xl mb-4 animate-bounce">⚽</div>
                                                    <p className="font-funnel-display text-xl text-white animate-pulse">
                                                        Generating random shot...
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {gameOutcome === 'goal' && shotResult && (
                                                <div className="text-center">
                                                    <div className="text-6xl mb-4">🎯</div>
                                                    <p className="font-funnel-display text-2xl text-red-400 font-bold mb-2">
                                                        GOAL! ⚽
                                                    </p>
                                                    <p className="font-funnel-display text-lg text-gray-300">
                                                        Shot went {getPositionEmoji(shotResult)} {shotResult}
                                                    </p>
                                                    <p className="font-funnel-display text-lg text-gray-300">
                                                        Keeper dove {getPositionEmoji(keeperChoice!)} {keeperChoice}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {gameOutcome === 'save' && shotResult && (
                                                <div className="text-center">
                                                    <div className="text-6xl mb-4">🧤</div>
                                                    <p className="font-funnel-display text-2xl text-green-400 font-bold mb-2">
                                                        SAVE! 🛡️
                                                    </p>
                                                    <p className="font-funnel-display text-lg text-gray-300">
                                                        Shot went {getPositionEmoji(shotResult)} {shotResult}
                                                    </p>
                                                    <p className="font-funnel-display text-lg text-gray-300">
                                                        Keeper dove {getPositionEmoji(keeperChoice!)} {keeperChoice}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Game Instructions */}
                                        <div className="bg-gray-900 p-6 rounded-lg max-w-md">
                                            <h4 className="font-funnel-display text-lg font-semibold text-white mb-3">
                                                How it works:
                                            </h4>
                                            <ul className="font-funnel-display text-sm text-gray-300 space-y-2">
                                                <li>• Choose where the goalkeeper should dive</li>
                                                <li>• Click "Take Penalty!" to generate a random shot</li>
                                                <li>• The blockchain provides verifiable randomness</li>
                                                <li>• If positions match, it's a save. Otherwise, it's a goal!</li>
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