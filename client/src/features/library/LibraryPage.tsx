import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  GridView,
  ViewList,
  Delete,
  FilterList,
} from '@mui/icons-material';
import { 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { papersApi } from '@/lib/api';
import { PaperCard } from '@/components/PaperCard';
import type { Paper } from '@/stores/paperStore';

export function LibraryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; paper: Paper | null }>({
    open: false,
    paper: null,
  });
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const { t } = useTranslation();
  
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['papers'],
    queryFn: () => papersApi.list(1, 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => papersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      toast.success(t('library.deleteSuccess'));
      setDeleteDialog({ open: false, paper: null });
    },
    onError: () => {
      toast.error(t('library.deleteFailed'));
    },
  });

  const papers: Paper[] = data?.data?.data?.papers || [];
  
  const filteredPapers = papers.filter((paper) => {
    const matchesSearch = searchQuery
      ? paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors?.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    const matchesStatus = statusFilter ? paper.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (paper: Paper, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteDialog({ open: true, paper });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-theme-primary">
            {t('library.title')}
          </h1>
          <p className="text-theme-muted mt-1 text-sm sm:text-base">
            {t('library.paperCount', { count: papers.length })}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted w-5 h-5" />
          <input
            type="text"
            placeholder={t('library.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 w-full"
          />
        </div>
        
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <IconButton
            onClick={(e) => setFilterAnchor(e.currentTarget)}
            className={`${statusFilter ? 'text-primary-400' : 'text-theme-muted'}`}
            size="large"
          >
            <FilterList />
          </IconButton>
          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={() => setFilterAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setStatusFilter(null);
                setFilterAnchor(null);
              }}
              selected={!statusFilter}
            >
              {t('library.allStatus')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter('ready');
                setFilterAnchor(null);
              }}
              selected={statusFilter === 'ready'}
            >
              {t('library.ready')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter('processing');
                setFilterAnchor(null);
              }}
              selected={statusFilter === 'processing'}
            >
              {t('library.processing')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setStatusFilter('failed');
                setFilterAnchor(null);
              }}
              selected={statusFilter === 'failed'}
            >
              {t('library.failed')}
            </MenuItem>
          </Menu>
          
          {/* Hide view toggle on small mobile, show on larger screens */}
          <div className="hidden xs:flex items-center border border-theme-border rounded-lg overflow-hidden">
            <IconButton
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-theme-surface-hover' : ''}
              size="large"
            >
              <GridView className={viewMode === 'grid' ? 'text-primary-400' : 'text-theme-muted'} />
            </IconButton>
            <IconButton
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-theme-surface-hover' : ''}
              size="large"
            >
              <ViewList className={viewMode === 'list' ? 'text-primary-400' : 'text-theme-muted'} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Papers Grid/List */}
      {isLoading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4 sm:gap-6`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-theme-tertiary rounded w-3/4 mb-4" />
              <div className="h-3 bg-theme-tertiary rounded w-1/2 mb-2" />
              <div className="h-3 bg-theme-tertiary rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="card text-center py-10 sm:py-16">
          <p className="text-theme-muted text-base sm:text-lg">
            {searchQuery || statusFilter
              ? t('library.noMatch')
              : t('library.empty')}
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4 sm:gap-6`}
        >
          <AnimatePresence mode="popLayout">
            {filteredPapers.map((paper) => (
              <motion.div
                key={paper._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group"
              >
                <PaperCard paper={paper} />
                {/* Show delete button always on mobile (touch), hover on desktop */}
                <button
                  onClick={(e) => handleDelete(paper, e)}
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2 bg-theme-surface/90 hover:bg-accent-coral/20 rounded-lg 
                    sm:opacity-0 sm:group-hover:opacity-100 transition-all touch-manipulation
                    active:scale-95"
                  aria-label={t('common.delete')}
                >
                  <Delete className="w-5 h-5 text-theme-muted hover:text-accent-coral" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, paper: null })}
      >
        <DialogTitle>{t('library.deletePaper')}</DialogTitle>
        <DialogContent>
          <p className="text-theme-secondary">
            {t('library.deleteConfirm', { title: deleteDialog.paper?.title || deleteDialog.paper?.fileName })}
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, paper: null })}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => deleteDialog.paper && deleteMutation.mutate(deleteDialog.paper._id)}
            color="error"
            variant="contained"
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
