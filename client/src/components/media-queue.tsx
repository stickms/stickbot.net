import { useEffect, useState } from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { Card, Link, IconButton, } from "@radix-ui/themes";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";

type MediaQueueProps = {
  internalQueue: string[];
  queueRemove: (index: string) => void;
  queueOrder: (from: number, to: number) => void;
};

function MediaQueue({ internalQueue, queueRemove, queueOrder }: MediaQueueProps) {
  const [activeId, setActiveId] = useState<string | number>();

  const [queue, setQueue] = useState<string[]>(internalQueue);

  useEffect(() => {
    setQueue(internalQueue);
  }, [ internalQueue ]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );
  
  if (!queue.length) {
    return null;
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    setActiveId(active.id);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (!over || active.id === over.id) {
      return;
    }

    const start = queue.findIndex((e) => e.startsWith(active.id.toString()));
    const end = queue.findIndex((e) => e.startsWith(over.id.toString()));

    setQueue(arrayMove(queue, start, end));
    queueOrder(start, end);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={queue}
        strategy={verticalListSortingStrategy}
      >
        {queue.map((entry, index) => {
          return <QueueItem
            key={entry}
            content={entry}
            index={index}
            queueRemove={queueRemove}
          />
        })}
      </SortableContext>
      <DragOverlay>
        {!!activeId && (
          <QueueItem
            content={queue.find((e) => e.startsWith(activeId.toString()))!}
            index={queue.findIndex((e) => e.startsWith(activeId.toString()))!}
            queueRemove={queueRemove}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

type QueueItemProps = {
  content: string;
  index: number;
  queueRemove: (index: string) => void
};

function QueueItem({ content, index, queueRemove }: QueueItemProps) {
  const split = content.indexOf(':');
  const id = content.substring(0, split);
  const url = content.substring(split + 1);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <Card
      ref={setNodeRef}
      className='flex items-center justify-between py-[6px] gap-2 touch-none'
      style={style}
      {...attributes}
      {...listeners}
    >
      <Link 
        className='text-xs text-center break-all'
        href={url}
        target='_blank'
        rel='noopener noreferrer'
      >
        {index + 1}. {url}
      </Link>

      <IconButton 
        variant='outline' 
        size='1'
        onClick={() => queueRemove(id)}
      >
        <Cross1Icon />
      </IconButton>
    </Card>
  );
}

export default MediaQueue;
