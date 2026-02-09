
import React from 'react';
import { 
  User, 
  Upload, 
  FileText, 
  BookOpen, 
  Activity, 
  CheckCircle, 
  List,
  Wand2
} from 'lucide-react';
import { StepKey } from './types';

export interface StepConfig {
  key: StepKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const STEPS: StepConfig[] = [
  {
    key: 'identificacao',
    label: 'Identificação',
    description: 'Dados pessoais e académicos',
    icon: <User className="w-5 h-5" />
  },
  {
    key: 'uploads',
    label: 'Instituição',
    description: 'Logotipo e documentos',
    icon: <Upload className="w-5 h-5" />
  },
  {
    key: 'resumo',
    label: 'Resumo',
    description: 'Síntese das atividades',
    icon: <FileText className="w-5 h-5" />
  },
  {
    key: 'introducao',
    label: 'Introdução',
    description: 'Contexto e objetivos',
    icon: <BookOpen className="w-5 h-5" />
  },
  {
    key: 'desenvolvimento',
    label: 'Desenvolvimento',
    description: 'O campo e a prática',
    icon: <Activity className="w-5 h-5" />
  },
  {
    key: 'conclusao',
    label: 'Conclusão',
    description: 'Fecho e reflexão',
    icon: <CheckCircle className="w-5 h-5" />
  },
  {
    key: 'referencias',
    label: 'Referências',
    description: 'Fontes consultadas',
    icon: <List className="w-5 h-5" />
  },
  {
    key: 'geracao',
    label: 'Gerar',
    description: 'Finalizar Relatório',
    icon: <Wand2 className="w-5 h-5" />
  }
];

export const PROVINCIAS_ANGOLA = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", "Cuanza Norte", "Cuanza Sul", 
  "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", 
  "Moxico", "Namibe", "Uíge", "Zaire"
];
