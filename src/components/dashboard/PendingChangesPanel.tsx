'use client';

import { useState } from 'react';
import { PendingOperation, Place } from '@/types';
import { groupPendingOperations } from '@/lib/dashboard-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Plus, Edit, Trash2, X, Check, Eye } from 'lucide-react';

interface PendingChangesPanelProps {
  operations: PendingOperation[];
  onExecute: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

export function PendingChangesPanel({
  operations,
  onExecute,
  onClear,
  onRemove,
}: PendingChangesPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const grouped = groupPendingOperations(operations);
  const hasOperations = operations.length > 0;

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <Plus className="h-3 w-3" />;
      case 'edit':
        return <Edit className="h-3 w-3" />;
      case 'delete':
        return <Trash2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-500';
      case 'edit':
        return 'bg-yellow-500';
      case 'delete':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const renderOperation = (op: PendingOperation) => (
    <div
      key={op.id}
      className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className={`rounded-full p-1 ${getOperationColor(op.type)}`}>
          {getOperationIcon(op.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{op.data.name || 'Unnamed'}</p>
          <p className="text-xs text-muted-foreground">{op.data.city || op.type}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(op.id)}
        className="h-6 w-6 p-0 flex-shrink-0"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          Pending Changes
          {hasOperations && (
            <Badge variant="secondary" className="text-xs">
              {operations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasOperations ? (
          <p className="text-xs text-muted-foreground">
            No pending changes.
          </p>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              {grouped.adds.length > 0 && (
                <Badge variant="default" className="bg-green-500 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  {grouped.adds.length}
                </Badge>
              )}
              {grouped.edits.length > 0 && (
                <Badge variant="default" className="bg-yellow-500 text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  {grouped.edits.length}
                </Badge>
              )}
              {grouped.deletes.length > 0 && (
                <Badge variant="default" className="bg-red-500 text-xs">
                  <Trash2 className="h-3 w-3 mr-1" />
                  {grouped.deletes.length}
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full h-8 text-xs">
                    <Eye className="h-3.5 w-3.5 mr-2" />
                    View Details
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-full" side="bottom">
                  <SheetHeader>
                    <SheetTitle>Pending Changes Details</SheetTitle>
                    <SheetDescription>
                      Review all pending operations before executing
                    </SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="h-[80vh] mt-6">
                    <div className="space-y-6 pr-4">
                      {grouped.adds.length > 0 && (
                        <div className="space-y-3">
                          <Badge variant="default" className="bg-green-500">
                            <Plus className="h-3 w-3 mr-1" />
                            {grouped.adds.length} Add{grouped.adds.length > 1 ? 's' : ''}
                          </Badge>
                          <div className="space-y-3">
                            {grouped.adds.map((op) => (
                              <div
                                key={op.id}
                                className="border rounded-lg p-4 bg-card space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-full p-1.5 bg-green-500">
                                      <Plus className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div>
                                      <p className="font-semibold">{op.data.name}</p>
                                      <p className="text-sm text-muted-foreground">{op.data.city}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(op.id)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {op.data.placeId && (
                                    <div>
                                      <span className="text-muted-foreground">Place ID:</span>
                                      <p className="font-mono text-xs">{op.data.placeId}</p>
                                    </div>
                                  )}
                                  {op.data.phone && (
                                    <div>
                                      <span className="text-muted-foreground">Phone:</span>
                                      <p>{op.data.phone}</p>
                                    </div>
                                  )}
                                  {op.data.address && (
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Address:</span>
                                      <p>{op.data.address}</p>
                                    </div>
                                  )}
                                  {op.data.area && (
                                    <div>
                                      <span className="text-muted-foreground">Area:</span>
                                      <p>{op.data.area}</p>
                                    </div>
                                  )}
                                  {op.data.price && (
                                    <div>
                                      <span className="text-muted-foreground">Price:</span>
                                      <p>{op.data.price}</p>
                                    </div>
                                  )}
                                  {op.data.rating && (
                                    <div>
                                      <span className="text-muted-foreground">Rating:</span>
                                      <p>{op.data.rating}</p>
                                    </div>
                                  )}
                                  {op.data.age && (
                                    <div>
                                      <span className="text-muted-foreground">Age:</span>
                                      <p>{op.data.age}</p>
                                    </div>
                                  )}
                                </div>
                                {op.data.description && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">Description:</span>
                                    <p className="text-sm">{op.data.description}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {grouped.edits.length > 0 && (
                        <div className="space-y-3">
                          <Badge variant="default" className="bg-yellow-500">
                            <Edit className="h-3 w-3 mr-1" />
                            {grouped.edits.length} Edit{grouped.edits.length > 1 ? 's' : ''}
                          </Badge>
                          <div className="space-y-3">
                            {grouped.edits.map((op) => (
                              <div
                                key={op.id}
                                className="border rounded-lg p-4 bg-card space-y-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-full p-1.5 bg-yellow-500">
                                      <Edit className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div>
                                      <p className="font-semibold">{op.data.name}</p>
                                      <p className="text-sm text-muted-foreground">{op.data.city}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(op.id)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Changes</p>
                                  <div className="grid gap-2">
                                    {Object.keys(op.data).map((key) => {
                                      const oldValue = op.originalData?.[key as keyof Place];
                                      const newValue = op.data[key as keyof Place];
                                      
                                      // Skip if values are the same or if it's metadata fields
                                      if (oldValue === newValue || ['id', 'photos', 'videos', 'createdAt', 'updatedAt'].includes(key)) {
                                        return null;
                                      }
                                      
                                      // Convert complex types to string
                                      const oldValueStr = typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue || 'null');
                                      const newValueStr = typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || 'null');
                                      
                                      return (
                                        <div key={key} className="border-l-2 border-yellow-500 pl-3 py-1">
                                          <p className="text-xs font-medium text-muted-foreground capitalize">{key}</p>
                                          <div className="flex items-center gap-2 text-sm">
                                            <span className="line-through text-muted-foreground">{oldValueStr}</span>
                                            <span>→</span>
                                            <span className="font-medium">{newValueStr}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {grouped.deletes.length > 0 && (
                        <div className="space-y-3">
                          <Badge variant="default" className="bg-red-500">
                            <Trash2 className="h-3 w-3 mr-1" />
                            {grouped.deletes.length} Delete{grouped.deletes.length > 1 ? 's' : ''}
                          </Badge>
                          <div className="space-y-3">
                            {grouped.deletes.map((op) => (
                              <div
                                key={op.id}
                                className="border border-red-200 rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20 space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-full p-1.5 bg-red-500">
                                      <Trash2 className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div>
                                      <p className="font-semibold">{op.data.name}</p>
                                      <p className="text-sm text-muted-foreground">{op.data.city}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemove(op.id)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  This place will be permanently deleted
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  {op.data.placeId && <div>Place ID: {op.data.placeId}</div>}
                                  {op.data.phone && <div>Phone: {op.data.phone}</div>}
                                  {op.data.area && <div>Area: {op.data.area}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <Button onClick={onExecute} className="w-full h-8 text-xs">
                <Check className="h-3.5 w-3.5 mr-2" />
                Execute All
              </Button>
              <Button
                onClick={onClear}
                variant="outline"
                className="w-full h-8 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-2" />
                Clear All
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
