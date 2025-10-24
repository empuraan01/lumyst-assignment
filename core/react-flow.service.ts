import type { GraphNode, GraphEdge, C1Output, C2Subcategory } from './types';

export class ReactFlowService {
	convertDataToReactFlowDataTypes(
		graphNodes: GraphNode[],
		c1Nodes: C1Output[],
		c2Nodes: C2Subcategory[],
		edges: GraphEdge[]
	) {
		const reactFlowNodes = [
			// Regular graph nodes
			...graphNodes.map((node) => ({
				id: node.id,
				position: node.position || { x: 0, y: 0 },
				data: { label: node.label },
				type: 'default',
				style: {
					background: '#dbeafe',
					border: '2px solid #3b82f6',
					color: '#1e40af',
					borderRadius: '6px'
				},
			})),
			// C1 category nodes
			...c1Nodes.map((node) => ({
				id: node.id,
				position: node.position || { x: 0, y: 0 },
				data: { label: node.label },
				type: 'default',
				style: {
					background: '#fef2f2',
					border: '3px solid #dc2626',
					color: '#991b1b',
					fontWeight: 'bold',
					borderRadius: '6px'
				},
			})),
			// C2 subcategory nodes
			...c2Nodes.map((node) => ({
				id: node.id,
				position: node.position || { x: 0, y: 0 },
				data: { label: node.label },
				type: 'default',
				style: {
					background: '#f0fdf4',
					border: '2px solid #16a34a',
					color: '#166534',
					borderRadius: '6px'
				},
			}))
		];

		const bidirectionalPairs = new Set<string>();
		const edgeMap = new Map<string, GraphEdge>();
		
		edges.forEach(edge => {
			const forwardKey = `${edge.source}-${edge.target}`;
			const reverseKey = `${edge.target}-${edge.source}`;
			edgeMap.set(forwardKey, edge);
			
			if (edgeMap.has(reverseKey)) {
				bidirectionalPairs.add(forwardKey);
				bidirectionalPairs.add(reverseKey);
			}
		});

		const reactFlowEdges = edges.map((edge) => {
			const edgeKey = `${edge.source}-${edge.target}`;
			const reverseKey = `${edge.target}-${edge.source}`;
			const isBidirectional = bidirectionalPairs.has(edgeKey);
			const isForwardDirection = edgeKey < reverseKey;
			
			let strokeColor = '#374151';
			let strokeWidth = 1;
			let strokeDasharray = undefined;
			
			if (edge.label === 'contains') {
				strokeColor = '#9ca3af';
				strokeDasharray = '5,5';
				strokeWidth = 1;
			} else if (edge.id.startsWith('c2_relationship')) {
				strokeColor = '#059669';
				strokeWidth = 2;
			} else if (edge.id.startsWith('cross_c1_c2_rel')) {
				strokeColor = '#d97706';
				strokeWidth = 2;
			}

			return {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				label: edge.label,
				type: isBidirectional ? 'bidirectional' : 'default',
				style: { 
					stroke: strokeColor, 
					strokeDasharray,
					strokeWidth 
				},
				labelStyle: { 
					fill: '#000', 
					fontWeight: '500'
				},
				data: {
					isBidirectional,
					isForward: isForwardDirection,
				}
			};
		});

		return {
			nodes: reactFlowNodes,
			edges: reactFlowEdges,
		};
	}
}
