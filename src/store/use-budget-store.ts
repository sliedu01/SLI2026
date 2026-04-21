import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getPublicUrlFromPath } from '@/lib/storage';

export interface BudgetCategory {
  id: string;
  name: string;
  projectId?: string;
  totalBudget: number;
  totalExpenditure: number;
}

export interface BudgetManagement {
  id: string;
  categoryId: string;
  name: string;
  budgetAmount: number; // 직접 입력된 예산
  totalBudget: number;  // (직접 입력된 예산) 또는 (하위 항목들의 합계)
  totalExpenditure: number;
  totalExpectedExpenditure: number;
  balance: number;
}

export interface BudgetExecution {
  id: string;
  managementId: string;
  name: string;
  budgetAmount: number;
  projectId?: string;
  expenditureAmount: number;
  expectedExpenditureAmount: number;
}

export interface Expenditure {
  id: string;
  executionId?: string;    // 기존 데이터 호환용 (옵션)
  managementId: string;    // LV2 연결
  subDetail: string;       // 세세목(LV3) 명칭
  date: string;            // 값이 없으면 '지출예정액'
  amount: number;         // 총액 (공급가액 + 부가세)
  supplyAmount: number;   // 공급가액
  vatAmount: number;      // 부가세
  proofType: 'TAX_INVOICE' | 'RECEIPT' | 'DEPOSIT' | 'CARD' | 'CASH_RECEIPT' | 'OTHER'; // 증빙유형 확장
  partnerId?: string;
  vendor: string;
  description: string;    // 적요
  status: 'PENDING' | 'COMPLETED'; // 집행예정, 집행완료 (보조 지표로 유지 가능)
  attachmentName?: string;
  attachmentOriginalName?: string;
  attachmentUrl?: string;
  createdAt: number;
}

interface BudgetState {
  categories: BudgetCategory[];
  managements: BudgetManagement[];
  executions: BudgetExecution[];
  expenditures: Expenditure[];
  isLoading: boolean;
  
  // Actions
  fetchBudgets: () => Promise<void>;
  syncBudgets: () => void;
  
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  addManagement: (categoryId: string, name: string, budgetAmount?: number) => Promise<void>;
  updateManagement: (id: string, data: { name?: string, budgetAmount?: number }) => Promise<void>;
  deleteManagement: (id: string) => Promise<void>;
  
  
  addExpenditure: (data: {
    managementId: string;
    subDetail: string;
    date: string;
    amount: number;
    supplyAmount: number;
    vatAmount: number;
    proofType: string;
    partnerId?: string;
    vendor: string;
    description: string;
    status: 'PENDING' | 'COMPLETED';
    attachmentName?: string;
    attachmentOriginalName?: string;
    attachmentUrl?: string;
  }) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  categories: [],
  managements: [],
  executions: [],
  expenditures: [],
  isLoading: false,

  fetchBudgets: async () => {
    set({ isLoading: true });
    
    const [cats, mans, execs, exps] = await Promise.all([
      supabase.from('budget_categories').select('*').order('created_at', { ascending: true }),
      supabase.from('budget_managements').select('*').order('created_at', { ascending: true }),
      supabase.from('budget_executions').select('*').order('created_at', { ascending: true }),
      supabase.from('expenditures').select('*').order('created_at', { ascending: true }),
    ]);

    const mappedCats: BudgetCategory[] = (cats.data || []).map(c => ({
      id: c.id, name: c.name, projectId: c.project_id, totalBudget: 0, totalExpenditure: 0
    }));

    const mappedMans: BudgetManagement[] = (mans.data || []).map(m => ({
      id: m.id, 
      categoryId: m.category_id, 
      name: m.name, 
      budgetAmount: Number(m.budget_amount || 0),
      totalBudget: 0, 
      totalExpenditure: 0,
      totalExpectedExpenditure: 0,
      balance: 0
    }));

    const mappedExecs: BudgetExecution[] = (execs.data || []).map(e => ({
      id: e.id, 
      managementId: e.management_id, 
      name: e.name, 
      budgetAmount: Number(e.budget_amount || 0), 
      projectId: e.project_id, 
      expenditureAmount: 0,
      expectedExpenditureAmount: 0
    }));

    const mappedExps: Expenditure[] = (exps.data || []).map(e => {
      const attachment = e.attachment as { fileName?: string; originalName?: string; fileUrl?: string } | null;
      return {
        id: e.id,
        executionId: e.execution_id,
        managementId: e.management_id,
        subDetail: e.sub_detail || '',
        date: e.date || '',
        amount: Number(e.amount || 0),
        supplyAmount: Number(e.supply_amount || 0),
        vatAmount: Number(e.vat_amount || 0),
        proofType: e.proof_type || 'OTHER',
        partnerId: e.partner_id,
        vendor: e.vendor_name || '',
        description: e.description || '',
        status: e.status || 'COMPLETED',
        attachmentName: attachment?.fileName,
        attachmentOriginalName: attachment?.originalName,
        attachmentUrl: attachment?.fileName 
          ? getPublicUrlFromPath('partner-documents', attachment.fileName.includes('/') ? attachment.fileName : `expenditures/${attachment.fileName}`) 
          : undefined,
        createdAt: new Date(e.created_at).getTime()
      };
    });

    set({ 
      categories: mappedCats, 
      managements: mappedMans, 
      executions: mappedExecs, 
      expenditures: mappedExps 
    });

    get().syncBudgets();
    set({ isLoading: false });
  },

  syncBudgets: () => {
    const { categories, managements, expenditures } = get();
    
    // LV2(Management)별 전체 집행 및 잔액 집계
    const updatedManagements = managements.map(man => {
      const relatedExps = expenditures.filter(exp => exp.managementId === man.id);
      
      // 날짜가 있으면 '집행완료', 없으면 '집행예정'
      const spent = relatedExps
        .filter(exp => exp.date && exp.date.trim() !== '')
        .reduce((sum, exp) => sum + exp.amount, 0);
        
      const expected = relatedExps
        .filter(exp => !exp.date || exp.date.trim() === '')
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      const managementBudget = man.budgetAmount || 0;
      
      return {
        ...man,
        totalBudget: managementBudget,
        totalExpenditure: spent,
        totalExpectedExpenditure: expected,
        balance: managementBudget - spent - expected
      };
    });

    const updatedCategories = categories.map(cat => {
      const children = updatedManagements.filter(man => man.categoryId === cat.id);
      return {
        ...cat,
        totalBudget: children.reduce((sum, c) => sum + (c.totalBudget || 0), 0),
        totalExpenditure: children.reduce((sum, c) => sum + (c.totalExpenditure || 0), 0)
      };
    });

    set({
      managements: updatedManagements,
      categories: updatedCategories
    });
  },

  addCategory: async (name) => {
    const { error } = await supabase.from('budget_categories').insert([{ name }]);
    if (error) throw error;
    await get().fetchBudgets();
  },

  updateCategory: async (id, name) => {
    const { error } = await supabase.from('budget_categories').update({ name }).eq('id', id);
    if (error) throw error;
    await get().fetchBudgets();
  },

  deleteCategory: async (id) => {
    const { error } = await supabase.from('budget_categories').delete().eq('id', id);
    if (error) throw error;
    await get().fetchBudgets();
  },

  addManagement: async (categoryId, name, budgetAmount) => {
    const { error } = await supabase.from('budget_managements').insert([{ 
      category_id: categoryId, 
      name,
      budget_amount: budgetAmount
    }]);
    if (error) throw error;
    await get().fetchBudgets();
  },

  updateManagement: async (id, data) => {
    const { error } = await supabase.from('budget_managements').update({
      name: data.name,
      budget_amount: data.budgetAmount
    }).eq('id', id);
    if (error) throw error;
    await get().fetchBudgets();
  },

  deleteManagement: async (id) => {
    const { error } = await supabase.from('budget_managements').delete().eq('id', id);
    if (error) throw error;
    await get().fetchBudgets();
  },


  addExpenditure: async (data) => {
    try {
      const { error } = await supabase.from('expenditures').insert([{
        management_id: data.managementId,
        sub_detail: data.subDetail,
        date: data.date,
        amount: data.amount,
        supply_amount: data.supplyAmount,
        vat_amount: data.vatAmount,
        proof_type: data.proofType,
        partner_id: data.partnerId,
        vendor_name: data.vendor,
        description: data.description,
        status: data.status,
        attachment: data.attachmentName ? {
          fileName: data.attachmentName,
          originalName: data.attachmentOriginalName,
          fileUrl: data.attachmentUrl
        } : null
      }]);

      if (error) {
        console.error('Supabase insert error details:', error);
        throw error;
      }
      await get().fetchBudgets();
    } catch (err) {
      console.error('addExpenditure unexpected error:', err);
      throw err;
    }
  },
}));
