export class LayoutCacheService {
  private static CACHE_KEY = 'graph-layout-cache';
  private static CACHE_VERSION = '1.0';
  private static CACHE_TTL = 24 * 60 * 60 * 1000;

  private static generateDataHash(
    graphNodes: any[],
    c1Nodes: any[],
    c2Nodes: any[],
    edges: any[]
  ): string {
    const dataString = JSON.stringify({
      nodeCount: graphNodes.length,
      c1Count: c1Nodes.length,
      c2Count: c2Nodes.length,
      edgeCount: edges.length,
      firstNodeId: graphNodes[0]?.id,
      lastNodeId: graphNodes[graphNodes.length - 1]?.id,
    });
    
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  static saveLayout(
    graphNodes: any[],
    c1Nodes: any[],
    c2Nodes: any[],
    edges: any[],
    layoutData: {
      graphNodes: any[];
      c1Nodes: any[];
      c2Nodes: any[];
    }
  ): void {
    try {
      const dataHash = this.generateDataHash(graphNodes, c1Nodes, c2Nodes, edges);
      
      const cacheEntry = {
        version: this.CACHE_VERSION,
        timestamp: Date.now(),
        dataHash,
        layout: layoutData,
      };

      const serialized = JSON.stringify(cacheEntry);
      
      if (serialized.length > 5 * 1024 * 1024) {
        console.warn('Layout too large for localStorage, skipping cache');
        return;
      }

      localStorage.setItem(this.CACHE_KEY, serialized);
      console.log('Layout cached successfully');
    } catch (error) {
      console.warn('Failed to cache layout:', error);
    }
  }

  static loadLayout(
    graphNodes: any[],
    c1Nodes: any[],
    c2Nodes: any[],
    edges: any[]
  ): {
    graphNodes: any[];
    c1Nodes: any[];
    c2Nodes: any[];
  } | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);

      if (cacheEntry.version !== this.CACHE_VERSION) {
        console.log('Cache version mismatch, invalidating');
        this.clearCache();
        return null;
      }

      const age = Date.now() - cacheEntry.timestamp;
      if (age > this.CACHE_TTL) {
        console.log('Cache expired, invalidating');
        this.clearCache();
        return null;
      }

      const currentHash = this.generateDataHash(graphNodes, c1Nodes, c2Nodes, edges);
      if (cacheEntry.dataHash !== currentHash) {
        console.log('Data changed, cache invalid');
        this.clearCache();
        return null;
      }

      console.log('Loaded layout from cache');
      return cacheEntry.layout;
    } catch (error) {
      console.warn('Failed to load cached layout:', error);
      this.clearCache();
      return null;
    }
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  static getCacheInfo(): {
    exists: boolean;
    size?: number;
    age?: number;
  } {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return { exists: false };

      const cacheEntry = JSON.parse(cached);
      return {
        exists: true,
        size: cached.length,
        age: Date.now() - cacheEntry.timestamp,
      };
    } catch {
      return { exists: false };
    }
  }
}

