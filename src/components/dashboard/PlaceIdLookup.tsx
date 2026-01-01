'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { client } from '@/lib/apollo-client';
import { GOOGLE_FIND_PLACE } from '@/graphql/queries';

interface PlaceIdLookupProps {
  className?: string;
}

export function PlaceIdLookup({ className }: PlaceIdLookupProps) {
  const { toast } = useToast();
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!placeName.trim() && !placeAddress.trim()) {
      toast({
        title: 'Input required',
        description: 'Please enter at least a place name or address.',
        variant: 'destructive',
      });
      return;
    }

    setPlaceId('');
    setCopied(false);
    setLoading(true);

    try {
      const query = [placeName, placeAddress].filter(Boolean).join(', ');
      
      // Use Apollo Client for GraphQL (business logic)
      const result = await client.query<{ googleFindPlace: Array<{ id: string; name: string; placeId: string }> }>({
        query: GOOGLE_FIND_PLACE,
        variables: { searchQuery: query },
        fetchPolicy: 'network-only',
      });

      const places = result.data?.googleFindPlace || [];

      if (places && places.length > 0) {
        const foundPlace = places[0];
        setPlaceId(foundPlace.placeId || '');
        toast({
          title: 'Place ID found',
          description: 'Successfully retrieved Google Place ID',
        });
      } else {
        toast({
          title: 'No results',
          description: 'Could not find a place matching your query.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Place ID lookup error:', error);
      toast({
        title: 'Error',
        description: 'Failed to lookup place ID. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (placeId) {
      navigator.clipboard.writeText(placeId);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Place ID copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Search className="h-4 w-4" />
          Google Place ID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Place Name Input */}
        <Input
          placeholder="Place name"
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          className="h-8 text-xs"
        />

        {/* Place Address Input */}
        <Input
          placeholder="Place address"
          value={placeAddress}
          onChange={(e) => setPlaceAddress(e.target.value)}
          className="h-8 text-xs"
        />

        {/* Lookup Button */}
        <Button
          type="button"
          size="sm"
          onClick={(e) => handleLookup(e)}
          disabled={loading}
          className="w-full h-8 text-xs"
        >
          {loading ? (
            <>
              <Search className="h-3 w-3 mr-1.5 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-3 w-3 mr-1.5" />
              Lookup
            </>
          )}
        </Button>

        {/* Result Display - Always visible */}
        <div className="relative">
          <Input
            value={placeId}
            readOnly
            placeholder="Place ID will appear here"
            className="h-8 text-xs pr-9 font-mono bg-muted/50"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => handleCopy(e)}
            disabled={!placeId}
            className="absolute right-0 top-0 h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
