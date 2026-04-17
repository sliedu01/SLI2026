import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

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
  totalBudget: number;
  totalExpenditure: number;
}

export interface BudgetExecution {
  id: string;
  managementId: string;
  name: string;
  budgetAmount: number;
  projectId?: string;
  expenditureAmount: number;
}

export interface Expenditure {
  id: string;
  executionId: string;
  date: string;
  amount: number;
  partnerId?: string;
  vendor: string; // UI 요구사항
  description: string;
  attachmentName?: string; // UI 요구사항
  attachmentOriginalName?: string; // UI 요구사항
  attachmentUrl?: string; // UI 요구사항
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
  addManagement: (categoryId: string, name: string) => Promise<void>;
  addExecution: (managementId: string, data: { name: string, budgetAmount: number, projectId?: string }) => Promise<void>;
  addExpenditure: (data: {
    executionId: string;
    date: string;
    amount: number;
    partnerId?: string;
    vendor: string;
    description: string;
    attachmentName?: string;
    attachmentOriginalName?: string;
    attachmentUrl?: string;
  }) => Promise<void>;
  deleteExecution: (id: string) => Promise<void>;
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
      id: m.id, categoryId: m.category_id, name: m.name, totalBudget: 0, totalExpenditure: 0
    }));

    const mappedExecs: BudgetExecution[] = (execs.data || []).map(e => ({
      id: e.id, managementId: e.management_id, name: e.name, budgetAmount: Number(e.budget_amount || 0), projectId: e.project_id, expenditureAmount: 0
    }));

    const mappedExps: Expenditure[] = (exps.data || []).map(e => {
      const attachment = e.attachment as { fileName?: string; originalName?: string; fileUrl?: string } | null;
      return {
        id: e.id,
        executionId: e.execution_id,
        date: e.date,
        amount: Number(e.amount || 0),
        partnerId: e.partner_id,
        vendor: e.vendor_name || '',
        description: e.description || '',
        attachmentName: attachment?.fileName,
        attachmentOriginalName: attachment?.originalName,
        attachmentUrl: attachment?.fileUrl,
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
    const { categories, managements, executions, expenditures } = get();
    
    const updatedExecutions = executions.map(ex => ({
      ...ex,
      expenditureAmount: expenditures
        .filter(exp => exp.executionId === ex.id)
        .reduce((sum, exp) => sum + exp.amount, 0)
    }));

    const updatedManagements = managements.map(man => {
      const children = updatedExecutions.filter(ex => ex.managementId === man.id);
      return {
        ...man,
        totalBudget: children.reduce((sum, c) => sum + c.budgetAmount, 0),
        totalExpenditure: children.reduce((sum, c) => sum + c.expenditureAmount, 0)
      };
    });

    const updatedCategories = categories.map(cat => {
      const children = updatedManagements.filter(man => man.categoryId === cat.id);
      return {
        ...cat,
        totalBudget: children.reduce((sum, c) => sum + c.totalBudget, 0),
        totalExpenditure: children.reduce((sum, c) => sum + c.totalExpenditure, 0)
      };
    });

    set({
      executions: updatedExecutions,
      managements: updatedManagements,
      categories: updatedCategories
    });
  },

  addCategory: async (name) => {
    const { error } = await supabase.from('budget_categories').insert([{ name }]);
    if (error) throw error;
    await get().fetchBudgets();
  },

  addManagement: async (categoryId, name) => {
    const { error } = await supabase.from('budget_managements').insert([{ category_id: categoryId, name }]);
    if (error) throw error;
    await get().fetchBudgets();
  },

  addExecution: async (managementId, data) => {
    const { error } = await supabase.from('budget_executions').insert([{
      management_id: managementId,
      name: data.name,
      budget_amount: data.budgetAmount,
      project_id: data.projectId
    }]);
    if (error) throw error;
    await get().fetchBudgets();
  },

  addExpenditure: async (data) => {
    const { error } = await supabase.from('expenditures').insert([{
      execution_id: data.executionId,
      date: data.date,
      amount: data.amount,
      partner_id: data.partnerId,
      vendor_name: data.vendor,
      description: data.description,
      attachment: {
        fileName: data.attachmentName,
        originalName: data.attachmentOriginalName,
        fileUrl: data.attachmentUrl
      }
    }]);
    if (error) throw error;
    await get().fetchBudgets();
  },

  deleteExecution: async (id) => {
    const { error } = await supabase.from('budget_executions').delete().eq('id', id);
    if (error) throw error;
    await get().fetchBudgets();
  }
}));
