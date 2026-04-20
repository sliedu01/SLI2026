'use client';

import * as React from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  RefreshCw, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/file-download';

interface FileUploadZoneProps {
  id?: string;
  label: string;
  value?: {
    originalName: string;
    fileName: string;
    fileUrl?: string;
  } | null;
  onChange: (fileInfo: { originalName: string, fileName: string, fileUrl: string, file?: File } | null) => void;
  onRename?: (originalName: string) => string; // 상위에서 명명 규칙 정의
  className?: string;
}

export function FileUploadZone({ 
  label, 
  value, 
  onChange, 
  onRename,
  className 
}: FileUploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalName = file.name;
      const fileName = onRename ? onRename(originalName) : originalName;
      const fileUrl = e.target?.result as string; // Data URL (Base64)
      
      onChange({
        originalName,
        fileName,
        fileUrl,
        file
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value?.fileUrl || !value?.originalName) return;
    
    try {
      await downloadFile(value.fileUrl, value.originalName);
    } catch {
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input 
        type="file" 
        ref={inputRef}
        className="hidden" 
        onChange={handleFileChange}
        accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
      />
      
      {!value ? (
        <div 
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center h-40 rounded-3xl border-2 border-dashed transition-all cursor-pointer group",
            isDragging 
              ? "bg-blue-50 border-blue-400 scale-[1.02] ring-4 ring-blue-50" 
              : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50/50 text-slate-400"
          )}
        >
          <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors mb-3">
            <Upload className={cn(
              "size-6 transition-all",
              isDragging ? "text-blue-600 animate-bounce" : "group-hover:text-blue-500"
            )} />
          </div>
          <span className="text-xs font-black text-slate-700 mb-0.5 group-hover:text-blue-600 transition-colors">
            {isDragging ? `${label} 놓기` : `${label} 선택`}
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            {isDragging ? "마우스를 놓으면 업로드됩니다" : "마우스로 파일을 끌어오세요"}
          </span>
        </div>
      ) : (
        <div className="relative h-40 rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden group/box">
          {/* 상태 표시 헤더 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-3 shadow-sm relative">
              <FileText className="size-6" />
              <CheckCircle2 className="absolute -top-1 -right-1 size-4 bg-white rounded-full p-0.5 fill-emerald-500 text-white" />
            </div>
            
            <div className="text-center space-y-1 px-4 w-full">
              <p className="text-[11px] font-black text-slate-800 truncate" title={value.originalName}>
                {value.originalName}
              </p>
              <p className="text-[9px] font-bold text-slate-400 truncate opacity-60">
                System: {value.fileName}
              </p>
            </div>
          </div>

          {/* 오버레이 관리 바 */}
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover/box:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
             <div className="flex gap-2">
                <Button 
                  type="button"
                  onClick={handleDownload}
                  variant="secondary" 
                  size="sm"
                  className="h-10 px-4 rounded-xl font-black text-[10px] bg-white text-slate-900 hover:bg-slate-100"
                >
                  <Download className="size-3 mr-2" /> 다운로드
                </Button>
                <Button 
                  type="button"
                  onClick={handleReplace}
                  variant="secondary" 
                  size="sm"
                  className="h-10 px-4 rounded-xl font-black text-[10px] bg-white text-slate-900 hover:bg-slate-100"
                >
                  <RefreshCw className="size-3 mr-2" /> 교체
                </Button>
             </div>
             <Button 
                type="button"
                onClick={handleDelete}
                variant="destructive" 
                size="sm"
                className="h-10 px-8 rounded-xl font-black text-[10px] shadow-lg shadow-red-900/20"
              >
                <Trash2 className="size-3 mr-2" /> 삭제하기
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}
