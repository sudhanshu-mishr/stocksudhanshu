"use client";

import { cn } from "@/lib/utils";
import React from "react";

export interface BentoItem {
    title: string;
    description: string | React.ReactNode;
    icon: React.ReactNode;
    status?: string;
    tags?: string[];
    meta?: string;
    cta?: string;
    colSpan?: number;
    hasPersistentHover?: boolean;
}

interface BentoGridProps {
    items: BentoItem[];
}

export function BentoGrid({ items }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mx-auto">
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(
                        "group relative p-5 rounded-2xl overflow-hidden transition-all duration-300",
                        "border border-slate-200/60 dark:border-white/10 bg-white dark:bg-zinc-950",
                        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)]",
                        "hover:-translate-y-1 will-change-transform",
                        item.colSpan || "col-span-1",
                        item.colSpan === 2 ? "md:col-span-2" : "",
                        item.colSpan === 3 ? "md:col-span-3" : "",
                        {
                            "shadow-[0_8px_30px_rgba(0,0,0,0.04)] -translate-y-1":
                                item.hasPersistentHover,
                            "dark:shadow-[0_8px_30px_rgba(255,255,255,0.04)]":
                                item.hasPersistentHover,
                        }
                    )}
                >
                    <div
                        className={`absolute inset-0 ${
                            item.hasPersistentHover
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                        } transition-opacity duration-300`}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:4px_4px]" />
                    </div>

                    <div className="relative flex flex-col space-y-4 h-full">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/10 group-hover:bg-gradient-to-br transition-all duration-300">
                                {item.icon}
                            </div>
                            {item.status && (
                                <span
                                    className={cn(
                                        "text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm",
                                        "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300",
                                        "transition-colors duration-300 group-hover:bg-slate-200 dark:group-hover:bg-white/20"
                                    )}
                                >
                                    {item.status}
                                </span>
                            )}
                        </div>

                        <div className="space-y-2 flex-grow">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-base">
                                {item.title}
                                {item.meta && (
                                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-normal">
                                        {item.meta}
                                    </span>
                                )}
                            </h3>
                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {item.description}
                            </div>
                        </div>

                        {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                                    {item.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-slate-200 dark:hover:bg-white/20"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                                {item.cta && (
                                    <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.cta}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div
                        className={`absolute inset-0 -z-10 rounded-2xl p-px bg-gradient-to-br from-transparent via-slate-200/50 to-transparent dark:via-white/10 ${
                            item.hasPersistentHover
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                        } transition-opacity duration-300`}
                    />
                </div>
            ))}
        </div>
    );
}
