'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { apiGet, apiPost } from '@/utils/api';
import { toast } from 'sonner';
import { Building, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Branch {
  id: string;
  name: string;
  address?: string;
}

export function BranchSelector() {
  const { user, refreshUser } = useUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await apiGet('/branches') as Branch[];
        setBranches(data);
      } catch (error) {
        console.error('Failed to load branches:', error);
        toast.error('Failed to load branches');
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.roles?.includes('owner')) {
      loadBranches();
    }
  }, [user]);

  const handleBranchSwitch = async (branchId: string) => {
    if (branchId === user?.branchId) return;
    
    setIsSwitching(true);
    try {
      await apiPost(`/branches/switch/${branchId}`, {});
      await refreshUser();
      toast.success('Branch switched successfully');
      router.refresh();
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast.error('Failed to switch branch');
    } finally {
      setIsSwitching(false);
    }
  };

  if (!user || !user.roles?.includes('owner')) {
    return null;
  }

  if (isLoading) {
    return (
      <Button variant="ghost" className="gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading branches...</span>
      </Button>
    );
  }

  if (branches.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isSwitching}>
          <Building className="h-4 w-4" />
          <span>{branches.find(b => b.id === user.branchId)?.name || 'Select Branch'}</span>
          <ChevronDown className="h-4 w-4" />
          {isSwitching && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleBranchSwitch(branch.id)}
            className="flex justify-between"
          >
            <span>{branch.name}</span>
            {user.branchId === branch.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}