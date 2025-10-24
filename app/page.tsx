"use client";

import { addEdge, applyEdgeChanges, applyNodeChanges, ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import { convertDataToGraphNodesAndEdges } from "../core/data/data-converter";
import { GraphFormatService } from "../core/graph-format.service";
import { ReactFlowService } from "../core/react-flow.service";
import { LayoutCacheService } from "../core/layout-cache.service";

const graphFormatService = new GraphFormatService();
const reactFlowService = new ReactFlowService();

export default function App() {
	const [nodes, setNodes] = useState<any[]>([]);
	const [edges, setEdges] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [loadingMessage, setLoadingMessage] = useState('Initializing...');

	useEffect(() => {
		initializeGraph();
	}, []);

	const initializeGraph = async () => {
		const {
			graphNodes,
			graphEdges,
			c1Output,
			c2Subcategories,
			c2Relationships,
			crossC1C2Relationships
		} = convertDataToGraphNodesAndEdges();

		setLoadingMessage('Checking cache...');
		const cachedLayout = LayoutCacheService.loadLayout(
			graphNodes,
			c1Output,
			c2Subcategories,
			graphEdges
		);

		if (cachedLayout) {
			setLoadingMessage('Loading from cache...');
			const allEdges = buildAllEdges(
				graphEdges,
				c2Subcategories,
				c2Relationships,
				crossC1C2Relationships
			);

			const { nodes: initialNodes, edges: initialEdges } = 
				reactFlowService.convertDataToReactFlowDataTypes(
					cachedLayout.graphNodes,
					cachedLayout.c1Nodes,
					cachedLayout.c2Nodes,
					allEdges,
				);

			setNodes(initialNodes);
			setEdges(initialEdges);
			setIsLoading(false);
			return;
		}

		if (typeof Worker !== 'undefined') {
			calculateLayoutWithWorker(
				graphNodes,
				c1Output,
				c2Subcategories,
				graphEdges,
				c2Relationships,
				crossC1C2Relationships
			);
		} else {
			calculateLayoutSync(
				graphNodes,
				graphEdges,
				c1Output,
				c2Subcategories,
				c2Relationships,
				crossC1C2Relationships
			);
		}
	};

	const calculateLayoutWithWorker = (
		graphNodes: any[],
		c1Output: any[],
		c2Subcategories: any[],
		graphEdges: any[],
		c2Relationships: any[],
		crossC1C2Relationships: any[]
	) => {
		setLoadingMessage('Starting background calculation...');

		const worker = new Worker(
			new URL('../core/workers/layout.worker.ts', import.meta.url),
			{ type: 'module' }
		);

		const allEdges = buildAllEdges(
			graphEdges,
			c2Subcategories,
			c2Relationships,
			crossC1C2Relationships
		);

		worker.postMessage({
			type: 'CALCULATE_LAYOUT',
			payload: {
				graphNodes,
				c1Nodes: c1Output,
				c2Nodes: c2Subcategories,
				edges: allEdges,
				config: {
					nodeSpacing: 100,
					rankSpacing: 150,
					edgeSeparation: 30,
					c1NodeSize: { width: 250, height: 80 },
					c2NodeSize: { width: 200, height: 60 },
					leafNodeSize: { width: 180, height: 50 },
				},
			},
		});

		worker.onmessage = (event: MessageEvent) => {
			const { type, progress, message, result, error } = event.data;

			switch (type) {
				case 'PROGRESS':
					setLoadingProgress(progress * 100);
					setLoadingMessage(message);
					break;

				case 'COMPLETE':
					LayoutCacheService.saveLayout(
						graphNodes,
						c1Output,
						c2Subcategories,
						graphEdges,
						result
					);

					const { nodes: initialNodes, edges: initialEdges } = 
						reactFlowService.convertDataToReactFlowDataTypes(
							result.graphNodes,
							result.c1Nodes,
							result.c2Nodes,
							allEdges,
						);

					setNodes(initialNodes);
					setEdges(initialEdges);
					setIsLoading(false);
					worker.terminate();
					break;

				case 'ERROR':
					console.error('Worker error:', error);
					setLoadingMessage('Error calculating layout, trying fallback...');
					calculateLayoutSync(
						graphNodes,
						graphEdges,
						c1Output,
						c2Subcategories,
						c2Relationships,
						crossC1C2Relationships
					);
					worker.terminate();
					break;
			}
		};
	};

	const calculateLayoutSync = (
		graphNodes: any[],
		graphEdges: any[],
		c1Output: any[],
		c2Subcategories: any[],
		c2Relationships: any[],
		crossC1C2Relationships: any[]
	) => {
		setLoadingMessage('Calculating layout...');

		const layoutedData = graphFormatService.layoutCategoriesWithNodes(
			graphNodes,
			graphEdges,
			c1Output,
			c2Subcategories,
			c2Relationships,
			crossC1C2Relationships
		);

		LayoutCacheService.saveLayout(
			graphNodes,
			c1Output,
			c2Subcategories,
			graphEdges,
			layoutedData
		);

		const { nodes: initialNodes, edges: initialEdges } = 
			reactFlowService.convertDataToReactFlowDataTypes(
				layoutedData.graphNodes,
				layoutedData.c1Nodes,
				layoutedData.c2Nodes,
				layoutedData.edges,
			);

		setNodes(initialNodes);
		setEdges(initialEdges);
		setIsLoading(false);
	};

	const buildAllEdges = (
		graphEdges: any[],
		c2Subcategories: any[],
		c2Relationships: any[],
		crossC1C2Relationships: any[]
	) => {
		const c2NameToIdMap = new Map();
		c2Subcategories.forEach((c2: any) => {
			c2NameToIdMap.set(c2.c2Name, c2.id);
		});

		return [
			...graphEdges,
			...c2Subcategories.map((c2: any) => ({
				id: `c1-${c2.c1CategoryId}-to-c2-${c2.id}`,
				source: c2.c1CategoryId,
				target: c2.id,
				label: 'contains'
			})),
			...c2Subcategories.flatMap((c2: any) =>
				c2.nodeIds.map((nodeId: string) => ({
					id: `c2-${c2.id}-to-node-${nodeId}`,
					source: c2.id,
					target: nodeId,
					label: 'contains'
				}))
			),
			...c2Relationships.map((rel: any) => {
				const sourceId = c2NameToIdMap.get(rel.fromC2);
				const targetId = c2NameToIdMap.get(rel.toC2);
				if (!sourceId || !targetId) return null;
				return {
					id: rel.id,
					source: sourceId,
					target: targetId,
					label: rel.label
				};
			}).filter(Boolean),
			...crossC1C2Relationships.map((rel: any) => {
				const sourceId = c2NameToIdMap.get(rel.fromC2);
				const targetId = c2NameToIdMap.get(rel.toC2);
				if (!sourceId || !targetId) return null;
				return {
					id: rel.id,
					source: sourceId,
					target: targetId,
					label: rel.label
				};
			}).filter(Boolean)
		];
	};

	const onNodesChange = useCallback(
		(changes: any) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
		[],
	);
	const onEdgesChange = useCallback(
		(changes: any) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
		[],
	);
	const onConnect = useCallback(
		(params: any) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
		[],
	);

	if (isLoading) {
		return (
			<div style={{ 
				width: "100vw", 
				height: "100vh", 
				display: "flex", 
				flexDirection: "column",
				alignItems: "center", 
				justifyContent: "center",
				background: "#f8fafc"
			}}>
				<div style={{ 
					background: "white", 
					padding: "40px", 
					borderRadius: "12px",
					boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
					minWidth: "400px"
				}}>
					<h2 style={{ marginBottom: "20px", color: "#1e293b" }}>
						Loading Graph Layout
					</h2>
					<div style={{ 
						width: "100%", 
						height: "8px", 
						background: "#e2e8f0", 
						borderRadius: "4px",
						overflow: "hidden",
						marginBottom: "12px"
					}}>
						<div style={{ 
							width: `${loadingProgress}%`, 
							height: "100%", 
							background: "#3b82f6",
							transition: "width 0.3s ease"
						}} />
					</div>
					<p style={{ color: "#64748b", fontSize: "14px" }}>
						{loadingMessage} ({Math.round(loadingProgress)}%)
					</p>
				</div>
			</div>
		);
	}

	return (
		<div style={{ width: "100vw", height: "100vh", background: "#f8fafc" }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				fitView
				minZoom={0.05}
				maxZoom={1.5}
				fitViewOptions={{ padding: 0.2 }}
				style={{ background: "#f8fafc" }}
			>
				<Background color="#e2e8f0" gap={16} />
				<Controls />
				<MiniMap 
					nodeColor={(node) => {
						if (node.style?.background) {
							return node.style.background as string;
						}
						return '#3b82f6';
					}}
					maskColor="rgba(240, 240, 240, 0.6)"
				/>
			</ReactFlow>
		</div>
	);
}
