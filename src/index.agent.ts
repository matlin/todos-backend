import { Agent } from '@aspen.cloud/agent-typings';

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
  views: {
    incomplete: async (params, aspen) => {
      const all = await aspen.getView('all', params);
      return all.filter((todo) => !todo.done);
    },
    all: async ({ list }, aspen) => {
      const todos: Todo[] = [];
      await aspen.processEvents(
        (event) => {
          if (event.data.type === 'todo') {
            const todo = {
              id: event.data.id,
              message: event.data.message || '',
              createdAt: event.inserted_at,
              done: false,
              listId: event.data.listId,
            };
            todos.push(todo);
          }
          if (event.data.type === 'status_change' && todos) {
            const todo = todos.find((todo) => todo.id == event.data.todoId);
            if (todo) {
              todo.done = event.data.isDone;
            }
          }
        },
        { list },
      );
      return todos;
    },
  },
  overviews: {
    test: 'test',
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
