import { Agent, Log } from '@aspen.cloud/agent-typings';

interface Todo {
  id: number;
  message: string;
  createdAt: string;
  done: boolean;
  listId: string;
}

const agent: Agent = {
  name: 'Simple Todos',
  sourceId: 'todos',
  aggregations: {
    todosInList: {
      initialize: (todoList?: Todo[]) => {
        return new Map(todoList?.map((todo) => [todo.id, todo]));
      },
      reducer: (todos: Map<number, Todo>, event: Log<any, any>) => {
        if (event.data.type === 'todo') {
          const todo: Todo = {
            id: event.data.id,
            message: event.data.message || '',
            createdAt: event.inserted_at.toDateString(),
            done: false,
            listId: event.data.listId,
          };
          todos.set(todo.id, todo);
        }
        if (event.data.type === 'status_change' && todos) {
          const todo = todos.get(event.data.todoId);
          if (todo) {
            todo.done = event.data.isDone;
          }
        }
        return todos;
      },
      serialize: (todoMap: Map<number, Todo>) => {
        return Array.from(todoMap.values());
      },
    },
    lists: {
      initialize: (lists?: string[]) => new Set(lists),
      reducer: (listSet: Set<string>, event) => {
        if (event.data.type === 'todo') {
          listSet.add(event.data.listId);
        }
        return listSet;
      },
      serialize: (listSet: Set<string>) => Array.from(listSet.values()),
    },
  },
  views: {
    lists: async (params, aspen) => {
      return await aspen.getAggregation('lists', { range: 'continuous' });
    },
    incomplete: async ({ list }, aspen) => {
      const todos = await aspen.getAggregation('todosInList', {
        tags: { list },
        range: 'continuous',
      });

      return todos.filter((todo) => !todo.done);
    },
    all: async ({ list }, aspen) => {
      const todos = await aspen.getAggregation('todosInList', {
        tags: { list },
        range: 'continuos',
      });

      return todos;
    },
  },
  actions: {
    add: async ({ message, list }, aspen) => {
      await aspen.appendToLog(
        {
          message,
          id: Math.floor(Math.random() * 1e9),
          type: 'todo',
          listId: list,
        },
        {
          list,
        },
      );
      return `Added ${message}`;
    },
    complete: async ({ id, listId }, aspen) => {
      const all = await aspen.getView('all', { list: listId });
      const todo = all.find((t: any) => t.id === id);
      if (todo && !todo.done) {
        await aspen.appendToLog(
          {
            type: 'status_change',
            todoId: id,
            isDone: true,
          },
          { list: listId },
        );
      }
    },
  },
};

export default agent;
