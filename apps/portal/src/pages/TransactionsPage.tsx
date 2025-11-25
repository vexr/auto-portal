import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/use-wallet';
import { useOperatorTransactions } from '@/hooks/use-operator-transactions';
import { useOperatorPosition, usePositions } from '@/hooks/use-positions';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { formatAI3, formatNumber, formatTimeAgo } from '@/lib/formatting';
import { Badge } from '@/components/ui/badge';
import { getSemanticColors, getTransactionStatusColors } from '@/lib/design-tokens';
import { shannonsToAi3, ai3ToShannons } from '@autonomys/auto-utils';
import type { OperatorTransaction } from '@/types/transactions';
import { STORAGE_FUND_PERCENTAGE } from '@/constants/staking';
import { config } from '@/config';
import { getOperatorAvatar } from '@/config/operator-avatars';
import { indexerService } from '@/services/indexer-service';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;
const EXPORT_BATCH_SIZE = 100;

type FilterType = 'all' | 'deposits' | 'withdrawals';

// SVG Icons
const ChevronLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const ChevronsLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 17l-5-5 5-5" />
    <path d="M18 17l-5-5 5-5" />
  </svg>
);

const ChevronsRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 17l5-5-5-5" />
    <path d="M6 17l5-5-5-5" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className ?? ''}`}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const ChevronDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// Operator avatar component - uses custom image if available, otherwise shows initial
const OperatorAvatar: React.FC<{
  operatorId: string;
  name: string;
  size?: 'sm' | 'md';
}> = ({ operatorId, name, size = 'md' }) => {
  const customAvatar = getOperatorAvatar(operatorId);
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textClasses = size === 'sm' ? 'text-sm' : '';

  if (customAvatar) {
    return (
      <img
        src={customAvatar}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0`}
    >
      <span className={`text-white font-semibold ${textClasses}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

interface OperatorSelectorProps {
  currentOperatorId: string;
  currentOperatorName?: string;
  operators: Array<{ operatorId: string; operatorName: string; totalValue: number }>;
  onSelect: (operatorId: string) => void;
}

const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  currentOperatorId,
  currentOperatorName,
  operators,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = currentOperatorName || `Operator ${currentOperatorId}`;

  if (operators.length <= 1) {
    // No dropdown needed if only one operator
    return (
      <div className="flex items-center gap-3">
        <OperatorAvatar operatorId={currentOperatorId} name={displayName} />
        <Text as="h2" variant="h2">
          {displayName}
        </Text>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg px-2 py-1 -ml-2 transition-colors"
      >
        <OperatorAvatar operatorId={currentOperatorId} name={displayName} />
        <Text as="h2" variant="h2">
          {displayName}
        </Text>
        <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[320px] bg-background border border-border rounded-lg shadow-lg z-50 py-1">
          {operators.map(op => {
            const isSelected = op.operatorId === currentOperatorId;
            const name = op.operatorName || `Operator ${op.operatorId}`;
            return (
              <button
                key={op.operatorId}
                onClick={() => {
                  if (!isSelected) {
                    onSelect(op.operatorId);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <OperatorAvatar operatorId={op.operatorId} name={name} size="sm" />
                <span className="flex-1 font-medium truncate">{name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatAI3(op.totalValue, 2)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SkeletonRow: React.FC = () => (
  <tr className="border-t animate-pulse">
    <td className="py-2 pr-4">
      <div className="h-4 bg-muted rounded w-16" />
    </td>
    <td className="py-2 pr-4 text-right">
      <div className="h-4 bg-muted rounded w-24 ml-auto" />
    </td>
    <td className="py-2 pr-4 text-right">
      <div className="h-4 bg-muted rounded w-20 ml-auto" />
    </td>
    <td className="py-2 pr-4 text-right">
      <div className="h-4 bg-muted rounded w-16 ml-auto" />
    </td>
    <td className="py-2 pr-4 text-right">
      <div className="h-4 bg-muted rounded w-16 ml-auto" />
    </td>
    <td className="py-2 pr-4 text-right">
      <div className="h-6 bg-muted rounded w-16 ml-auto" />
    </td>
  </tr>
);

export const TransactionsPage: React.FC = () => {
  const { operatorId = '' } = useParams();
  const navigate = useNavigate();
  const { isConnected, selectedAccount } = useWallet();
  const { position, loading: positionLoading } = useOperatorPosition(operatorId);
  const { positions } = usePositions({ refreshInterval: 0 });
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [exporting, setExporting] = React.useState(false);

  // Get current operator name from positions
  const currentOperator = positions.find(p => p.operatorId === operatorId);
  const currentOperatorName = currentOperator?.operatorName;

  // Filter to only operators with positions, sorted by total value descending
  const stakedOperators = React.useMemo(
    () =>
      positions
        .filter(p => p.positionValue > 0 || p.storageFeeDeposit > 0 || p.pendingDeposit)
        .map(p => ({
          operatorId: p.operatorId,
          operatorName: p.operatorName,
          totalValue: p.positionValue + p.storageFeeDeposit + (p.pendingDeposit?.amount || 0),
        }))
        .sort((a, b) => b.totalValue - a.totalValue),
    [positions],
  );

  const handleOperatorSelect = (newOperatorId: string) => {
    navigate(`/transactions/${newOperatorId}`);
  };

  const {
    transactions,
    deposits,
    withdrawals,
    loading,
    error,
    page,
    goToPage,
    depositsCount,
    withdrawalsCount,
  } = useOperatorTransactions(operatorId, { pageSize, filter });

  const handleExportCSV = React.useCallback(async () => {
    if (!selectedAccount || exporting) return;

    setExporting(true);

    try {
      // Fetch all deposits
      const allDeposits: typeof deposits = [];
      let depositOffset = 0;
      while (true) {
        const result = await indexerService.getDepositsByOperator({
          address: selectedAccount.address,
          operatorId,
          limit: EXPORT_BATCH_SIZE,
          offset: depositOffset,
        });
        allDeposits.push(...result.rows);
        if (result.rows.length < EXPORT_BATCH_SIZE) break;
        depositOffset += EXPORT_BATCH_SIZE;
      }

      // Fetch all withdrawals
      const allWithdrawals: typeof withdrawals = [];
      let withdrawalOffset = 0;
      while (true) {
        const result = await indexerService.getWithdrawalsByOperator({
          address: selectedAccount.address,
          operatorId,
          limit: EXPORT_BATCH_SIZE,
          offset: withdrawalOffset,
        });
        allWithdrawals.push(...result.rows);
        if (result.rows.length < EXPORT_BATCH_SIZE) break;
        withdrawalOffset += EXPORT_BATCH_SIZE;
      }

      // Build CSV (matches table column order)
      const csvRows: string[] = [];
      csvRows.push('Type,Staked Amount (AI3),Storage Fee (AI3),Timestamp,Block,Status');

      for (const dep of allDeposits) {
        const amount = formatAI3(shannonsToAi3(dep.pending_amount ?? '0'));
        const storageFee = formatAI3(shannonsToAi3(dep.pending_storage_fee_deposit ?? '0'));
        const status = dep.pending_effective_domain_epoch ? 'pending' : 'complete';
        const timestamp = new Date(dep.timestamp).toISOString();
        csvRows.push(
          `Deposit,"${amount}","${storageFee}",${timestamp},${dep.block_height},${status}`,
        );
      }

      for (const wit of allWithdrawals) {
        const amount = formatAI3(shannonsToAi3(wit.total_withdrawal_amount ?? '0'));
        const storageFee = formatAI3(shannonsToAi3(wit.total_storage_fee_withdrawal ?? '0'));
        const status = wit.withdrawal_in_shares_unlock_block ? 'pending' : 'complete';
        const timestamp = new Date(wit.timestamp).toISOString();
        csvRows.push(
          `Withdrawal,"${amount}","${storageFee}",${timestamp},${wit.block_height},${status}`,
        );
      }

      // Download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.network.defaultNetworkId}-operator-${operatorId}-transactions.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [selectedAccount, operatorId, exporting]);

  const transactionsToRender = React.useMemo<OperatorTransaction[]>(() => {
    let txs = transactions;

    const hasPendingDepositRow = transactions.some(
      t => t.type === 'deposit' && t.status === 'pending',
    );

    // If there is a pending deposit, but no pending deposit row, add a synthetic deposit row representing the pending deposit
    if (!hasPendingDepositRow && position?.pendingDeposit) {
      const domainIdCandidate: string =
        (transactions[0] && (transactions[0] as OperatorTransaction).domainId) ||
        (deposits[0] && deposits[0].domain_id) ||
        (withdrawals[0] && withdrawals[0].domain_id) ||
        '0';
      const { amount } = position.pendingDeposit;
      const storageAi3 = amount * (STORAGE_FUND_PERCENTAGE / (1 - STORAGE_FUND_PERCENTAGE));
      const syntheticDeposit: OperatorTransaction = {
        id: `synthetic-deposit-${operatorId}-${
          position.pendingDeposit.effectiveEpoch ?? 'unknown'
        }`,
        operatorId: operatorId,
        domainId: String(domainIdCandidate),
        address: '',
        timestamp: new Date().toISOString(),
        blockHeight: '',
        extrinsicIds: undefined,
        eventIds: undefined,
        type: 'deposit',
        amount: ai3ToShannons(amount.toString()).toString(),
        storageFeeDeposit: ai3ToShannons(storageAi3.toString()).toString(),
        effectiveEpoch: position.pendingDeposit.effectiveEpoch,
        status: 'pending',
      } as OperatorTransaction;

      txs = [syntheticDeposit, ...transactions];
    }

    return txs;
  }, [transactions, position, operatorId, deposits, withdrawals]);

  if (!operatorId) {
    return (
      <div className="p-6">
        <Text variant="h5">Invalid operator</Text>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6">
        <Text variant="h5">Connect your wallet to view operator details.</Text>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <OperatorSelector
          currentOperatorId={operatorId}
          currentOperatorName={currentOperatorName}
          operators={stakedOperators}
          onSelect={handleOperatorSelect}
        />
        <Text as="p" variant="bodySmall" className="text-muted-foreground mt-1">
          View your deposits and withdrawals for this operator.
        </Text>
        {isConnected && !positionLoading && position && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {position.pendingDeposit && (
              <Badge
                variant="outline"
                className="bg-warning-100 text-warning-800 border-warning-200"
              >
                Pending deposit
              </Badge>
            )}
            {position.pendingWithdrawals.length > 0 && (
              <Badge
                variant="outline"
                className="bg-warning-100 text-warning-800 border-warning-200"
              >
                {position.pendingWithdrawals.length} pending withdrawal
                {position.pendingWithdrawals.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Text as="h3" variant="h3">
            Transactions
          </Text>
          <Text variant="bodySmall" className="text-muted-foreground">
            {filter === 'all' && `Deposits: ${depositsCount} | Withdrawals: ${withdrawalsCount}`}
            {filter === 'deposits' && `Deposits: ${depositsCount}`}
            {filter === 'withdrawals' && `Withdrawals: ${withdrawalsCount}`}
          </Text>
        </div>
        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex gap-1">
            {(['all', 'deposits', 'withdrawals'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  filter === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'deposits' ? 'Deposits' : 'Withdrawals'}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting || loading || transactionsToRender.length === 0}
          >
            {exporting ? <SpinnerIcon className="mr-1" /> : <DownloadIcon className="mr-1" />}
            Export Transactions
          </Button>
        </div>

        {error && (
          <Text variant="bodySmall" className={getSemanticColors('error').text}>
            {error}
          </Text>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Staked Amount</th>
                <th className="py-2 pr-4 text-right">Storage Fee Deposit</th>
                <th className="py-2 pr-4 text-right">Timestamp</th>
                <th className="py-2 pr-4 text-right">Block</th>
                <th className="py-2 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : transactionsToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactionsToRender.map(tx => {
                  const normalizedStatus = (() => {
                    if (tx.type === 'deposit') {
                      return tx.status === 'complete' ? 'confirmed' : 'pending';
                    }
                    return tx.status === 'complete' ? 'confirmed' : 'pending';
                  })();
                  const statusClasses = getTransactionStatusColors(
                    normalizedStatus as 'pending' | 'confirmed',
                  );
                  const date = new Date(tx.timestamp);
                  return (
                    <tr key={`${tx.type}-${tx.id}`} className="border-t">
                      <td className="py-2 pr-4 capitalize">{tx.type}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {'amount' in tx ? formatAI3(shannonsToAi3(tx.amount)) : ''}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {'storageFeeDeposit' in tx
                          ? formatAI3(shannonsToAi3(tx.storageFeeDeposit))
                          : 'storageFeeRefund' in tx
                            ? formatAI3(shannonsToAi3(tx.storageFeeRefund))
                            : ''}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono" title={date.toLocaleString()}>
                        {formatTimeAgo(date.getTime())}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {(() => {
                          if (!tx.blockHeight) return '-';
                          const blockUrl = config.explorer.getBlockUrl(tx.blockHeight);
                          const formattedBlock = formatNumber(Number(tx.blockHeight));
                          if (!blockUrl) {
                            return <span className="font-mono">{formattedBlock}</span>;
                          }
                          return (
                            <a
                              href={blockUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              {formattedBlock}
                              <ExternalLinkIcon className="opacity-50" />
                            </a>
                          );
                        })()}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Badge variant="outline" className={statusClasses.badge}>
                          {'status' in tx ? tx.status : ''}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(() => {
          const totalCount =
            filter === 'deposits'
              ? depositsCount
              : filter === 'withdrawals'
                ? withdrawalsCount
                : depositsCount + withdrawalsCount;
          const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
          const startItem = totalCount === 0 ? 0 : page * pageSize + 1;
          const endItem = Math.min((page + 1) * pageSize, totalCount);
          const isFirstPage = page === 0;
          const isLastPage = (page + 1) * pageSize >= totalCount;

          const handlePageSizeChange = (newSize: number) => {
            setPageSize(newSize);
            // Hook automatically resets to page 0 when pageSize changes
          };

          return (
            <div className="flex flex-col gap-3 pt-3">
              {/* Info row */}
              <div className="flex items-center justify-between">
                <Text variant="bodySmall" className="text-muted-foreground">
                  {totalCount === 0
                    ? 'No transactions'
                    : totalCount === 1
                      ? 'Showing 1 transaction'
                      : startItem === 1 && endItem === totalCount
                        ? `Showing ${totalCount} transactions`
                        : `Showing ${startItem}-${endItem} of ${totalCount} transactions`}
                </Text>
                <div className="flex items-center gap-2">
                  <Text variant="bodySmall" className="text-muted-foreground">
                    Rows per page:
                  </Text>
                  <select
                    value={pageSize}
                    onChange={e => handlePageSizeChange(Number(e.target.value))}
                    className="bg-background border border-border rounded px-2 py-1 text-sm"
                    disabled={loading}
                  >
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation row */}
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(0)}
                  disabled={isFirstPage || loading}
                  title="First page"
                >
                  <ChevronsLeft />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(Math.max(0, page - 1))}
                  disabled={isFirstPage || loading}
                  title="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <Text
                  variant="bodySmall"
                  className="text-muted-foreground px-3 min-w-[100px] text-center"
                >
                  Page {page + 1} of {totalPages}
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={isLastPage || loading}
                  title="Next page"
                >
                  <ChevronRight />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(totalPages - 1)}
                  disabled={isLastPage || loading}
                  title="Last page"
                >
                  <ChevronsRight />
                </Button>
              </div>
            </div>
          );
        })()}
      </Card>
    </div>
  );
};
