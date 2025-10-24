import dagre from 'dagre';

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CALCULATE_LAYOUT':
      calculateLayout(payload);
      break;
    default:
      console.warn('Unknown worker message type:', type);
  }
};

interface LayoutPayload {
  graphNodes: any[];
  c1Nodes: any[];
  c2Nodes: any[];
  edges: any[];
  config: {
    nodeSpacing: number;
    rankSpacing: number;
    edgeSeparation: number;
    c1NodeSize: { width: number; height: number };
    c2NodeSize: { width: number; height: number };
    leafNodeSize: { width: number; height: number };
  };
}

function calculateLayout(payload: LayoutPayload) {
  try {
    const { graphNodes, c1Nodes, c2Nodes, edges, config } = payload;

    postMessage({
      type: 'PROGRESS',
      progress: 0,
      message: 'Initializing layout...',
    });

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: 'TB',
      nodesep: config.nodeSpacing,
      ranksep: config.rankSpacing,
      edgesep: config.edgeSeparation,
      marginx: 50,
      marginy: 50,
    });

    const totalNodes = graphNodes.length + c1Nodes.length + c2Nodes.length;
    let processedNodes = 0;

    graphNodes.forEach((node: any) => {
      dagreGraph.setNode(node.id, {
        width: config.leafNodeSize.width,
        height: config.leafNodeSize.height,
      });
      processedNodes++;
      
      if (processedNodes % 100 === 0) {
        postMessage({
          type: 'PROGRESS',
          progress: (processedNodes / totalNodes) * 0.3,
          message: `Adding nodes... ${processedNodes}/${totalNodes}`,
        });
      }
    });

    c1Nodes.forEach((node: any) => {
      dagreGraph.setNode(node.id, {
        width: config.c1NodeSize.width,
        height: config.c1NodeSize.height,
      });
    });

    c2Nodes.forEach((node: any) => {
      dagreGraph.setNode(node.id, {
        width: config.c2NodeSize.width,
        height: config.c2NodeSize.height,
      });
    });

    postMessage({
      type: 'PROGRESS',
      progress: 0.4,
      message: 'Adding edges...',
    });

    edges.forEach((edge: any, index: number) => {
      dagreGraph.setEdge(edge.source, edge.target);
      
      if (index % 100 === 0) {
        postMessage({
          type: 'PROGRESS',
          progress: 0.4 + (index / edges.length) * 0.2,
          message: `Adding edges... ${index}/${edges.length}`,
        });
      }
    });

    postMessage({
      type: 'PROGRESS',
      progress: 0.6,
      message: 'Calculating layout...',
    });

    dagre.layout(dagreGraph);

    postMessage({
      type: 'PROGRESS',
      progress: 0.9,
      message: 'Extracting positions...',
    });

    const positionedGraphNodes = graphNodes.map((node: any) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    const positionedC1Nodes = c1Nodes.map((node: any) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    const positionedC2Nodes = c2Nodes.map((node: any) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    postMessage({
      type: 'COMPLETE',
      result: {
        graphNodes: positionedGraphNodes,
        c1Nodes: positionedC1Nodes,
        c2Nodes: positionedC2Nodes,
      },
    });
  } catch (error: any) {
    postMessage({
      type: 'ERROR',
      error: error.message || 'Layout calculation failed',
    });
  }
}

