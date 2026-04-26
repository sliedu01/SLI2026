'use client';

import * as React from 'react';
import { ChevronRight, ChevronDown, CheckSquare, Square, Building2, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/store/use-project-store';
import { Partner } from '@/store/use-partner-store';

interface ProjectTreeProps {
  projects: Project[];
  partners: Partner[];
  visibleProjectIds: string[];
  expandedIds: string[];
  selectedProjectIds: string[];
  onToggleExpand: (id: string) => void;
  onSelect: (ids: string[]) => void;
}

export function ProjectTree({ 
  projects, partners, visibleProjectIds, expandedIds, selectedProjectIds, onToggleExpand, onSelect 
}: ProjectTreeProps) {
  const renderNodes = (parentId: string | null = null, depth = 0) => {
    const currentNodes = projects.filter(p => p.parentId === parentId);
    if (currentNodes.length === 0) return null;

    return (
      <div className={cn("space-y-1", depth > 0 && "mt-1")}>
        {currentNodes.map(p => {
          if (!visibleProjectIds.includes(p.id)) return null;
          const isExpanded = expandedIds.includes(p.id);
          const isSelected = selectedProjectIds.includes(p.id);
          const hasVisibleChildren = projects.some(c => c.parentId === p.id && visibleProjectIds.includes(c.id));
          const partner = partners.find(ptr => ptr.id === p.partnerId);

          return (
            <div key={p.id} className="select-none">
              <div 
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer group transition-all duration-200",
                  isSelected 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200 dark:shadow-none" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
                onClick={() => onSelect([p.id])}
              >
                <div 
                  className="p-0.5 rounded-md hover:bg-white/20 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasVisibleChildren) onToggleExpand(p.id);
                  }}
                >
                  {hasVisibleChildren ? (
                    isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
                  ) : (
                    <div className="size-4" />
                  )}
                </div>
                
                {p.level === 1 ? (
                  <Building2 className={cn("size-4", isSelected ? "text-blue-400" : "text-slate-400")} />
                ) : (
                  <Folder className={cn("size-4", isSelected ? "text-amber-400" : "text-slate-400")} />
                )}

                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold truncate tracking-tight">{p.name}</p>
                  {partner && (
                    <p className={cn("text-[10px] opacity-60 font-medium", isSelected ? "text-slate-300" : "text-slate-500")}>
                      {partner.name}
                    </p>
                  )}
                </div>

                {isSelected ? (
                  <CheckSquare className="size-4 text-blue-400" />
                ) : (
                  <Square className="size-4 opacity-20 group-hover:opacity-40" />
                )}
              </div>
              {isExpanded && hasVisibleChildren && (
                <div className="ml-4 pl-3 border-l-2 border-slate-100 dark:border-slate-800/50 mt-1">
                  {renderNodes(p.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return <div className="space-y-1">{renderNodes(null)}</div>;
}
