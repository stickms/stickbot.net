import { useEffect, useState } from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { Card, Link, IconButton, Flex, Button, AlertDialog, } from "@radix-ui/themes";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, DragEndEvent, PointerSensor, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { SyncRoomQueue } from "../lib/types";
import { restrictToParentElement } from "@dnd-kit/modifiers";

type MediaQueueProps = {
  internalQueue: SyncRoomQueue;
  queueRemove: (index: string) => void;
  queueOrder: (from: number, to: number) => void;
  queueClear: () => void;
};

function MediaQueue({ internalQueue, queueRemove, queueOrder, queueClear }: MediaQueueProps) {
  const [ queue, setQueue ] = useState<SyncRoomQueue>(internalQueue);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (!over || active.id === over.id) {
      return;
    }

    const start = queue.findIndex((e) => e.id === active.id.toString());
    const end = queue.findIndex((e) => e.id === over.id.toString());

    setQueue(arrayMove(queue, start, end));
    queueOrder(start, end);
  }

  return (
    <Flex className='flex-col'>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        modifiers={[ restrictToParentElement ]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={queue}
          strategy={verticalListSortingStrategy}
        >
          {queue.map((entry, index) => {
            return <QueueItem
              key={entry.id}
              content={entry}
              index={index}
              queueRemove={queueRemove}
            />
          })}
        </SortableContext>
      </DndContext>

      <Flex className='items-center justify-end'>
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button>Clear Queue</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content className='max-w-96'>
            <AlertDialog.Title>Clear Queue</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to clear the queue?
            </AlertDialog.Description>
            <Flex className='mt-4 gap-3 justify-end'>
              <AlertDialog.Cancel>
                <Button variant='soft' color='gray'>
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button variant='solid' color='red' onClick={queueClear}>
                  Clear
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Flex>
  );
}

type QueueItemProps = {
  content: {
    id: string;
    url: string;
    title: string;  
  };
  index: number;
  queueRemove: (id: string) => void
};

function QueueItem({ content, index, queueRemove }: QueueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: content.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <Card
      ref={setNodeRef}
      className='flex items-center justify-between py-[6px] gap-2 touch-none mb-2'
      style={style}
      {...attributes}
      {...listeners}
    >
      <Link 
        className='text-xs text-center break-all'
        href={content.url}
        target='_blank'
        rel='noopener noreferrer'
      >
        {index + 1}. {content.title}
      </Link>

      <IconButton 
        variant='outline' 
        size='1'
        onClick={() => queueRemove(content.id)}
      >
        <Cross1Icon />
      </IconButton>
    </Card>
  );
}

export default MediaQueue;
