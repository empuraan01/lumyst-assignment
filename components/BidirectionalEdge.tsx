import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useMemo } from 'react';

export function BidirectionalEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	label,
	style,
	markerEnd,
	data,
}: EdgeProps) {
	const offset = data?.isBidirectional ? (data?.isForward ? 20 : -20) : 0;
	
	const [edgePath, labelX, labelY] = useMemo(() => {
		const dx = targetX - sourceX;
		const dy = targetY - sourceY;
		const length = Math.sqrt(dx * dx + dy * dy);
		
		if (length === 0) {
			return getBezierPath({ 
				sourceX, 
				sourceY, 
				targetX, 
				targetY, 
				sourcePosition, 
				targetPosition 
			});
		}
		
		const perpX = -dy / length;
		const perpY = dx / length;
		
		const offsetSourceX = sourceX + perpX * offset;
		const offsetSourceY = sourceY + perpY * offset;
		const offsetTargetX = targetX + perpX * offset;
		const offsetTargetY = targetY + perpY * offset;
		
		return getBezierPath({
			sourceX: offsetSourceX,
			sourceY: offsetSourceY,
			targetX: offsetTargetX,
			targetY: offsetTargetY,
			sourcePosition,
			targetPosition,
		});
	}, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset]);

	return (
		<>
			<BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
			{label && (
				<EdgeLabelRenderer>
					<div
						style={{
							position: 'absolute',
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							background: 'white',
							padding: '2px 8px',
							borderRadius: '4px',
							fontSize: 12,
							fontWeight: 500,
							border: '1px solid #ddd',
							pointerEvents: 'all',
						}}
						className="nodrag nopan"
					>
						{label}
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}

