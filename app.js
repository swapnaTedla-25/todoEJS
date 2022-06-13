const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

var isValid = require("date-fns/isValid");
var format = require("date-fns/format");
var parseISO = require("date-fns/parseISO");

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const covertDbObjToResObj = (dbObj) => {
  return {
    id: dbObj.id,
    todo: dbObj.todo,
    priority: dbObj.priority,
    status: dbObj.status,
    category: dbObj.category,
    dueDate: dbObj.due_date,
  };
};

const checkIsValid = (request, response, next) => {
  const reqBody = request.body;
  const reqQuery = request.query;

  if (
    reqQuery.status === "TO DO" ||
    reqQuery.status === "IN PROGRESS" ||
    reqQuery.status === "DONE" ||
    reqBody.status === "TO DO" ||
    reqBody.status === "IN PROGRESS" ||
    reqBody.status === "DONE"
  ) {
    next();
  } else if (
    reqQuery.priority === "HIGH" ||
    reqQuery.priority === "MEDIUM" ||
    reqQuery.priority === "LOW" ||
    reqBody.priority === "HIGH" ||
    reqBody.priority === "MEDIUM" ||
    reqBody.priority === "LOW"
  ) {
    next();
  } else if (
    reqQuery.category === "WORK" ||
    reqQuery.category === "LEARNING" ||
    reqQuery.category === "HOME" ||
    reqBody.category === "WORK" ||
    reqBody.category === "LEARNING" ||
    reqBody.category === "HOME"
  ) {
    next();
  } else if (reqQuery.date != undefined || reqBody.date != undefined) {
    //var formatDate = format(new Date(reqQuery.date), "yyyy-MM-dd");
    var formatDate = format(new Date(reqQuery.date), "yyyy-MM-dd");

    if (parseISO(formatDate) != "Invalid Date") {
      next();
    }
    // next();
  } else if (reqQuery.search_q != undefined || reqBody.search_q != undefined) {
    next();
  } else {
    response.status(400);
    let resMessage = "";

    switch (true) {
      case reqQuery.status != undefined || reqBody.status != undefined:
        resMessage = "Todo Status";
        break;
      case reqQuery.priority != undefined || reqBody.priority != undefined:
        resMessage = "Todo Priority";
        break;
      case reqQuery.category != undefined || reqBody.category != undefined:
        resMessage = "Todo Category";
        break;
      default:
        resMessage = "Due Date";
    }
    response.send(`Invalid ${resMessage}`);
  }
};

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasPriorityAndCategoryProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};
const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

//1.get todo API
app.get("/todos/", checkIsValid, async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;

    case hasPriorityAndCategoryProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      break;

    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
  }

  data = await db.all(getTodosQuery);

  response.send(data.map((eachtodo) => covertDbObjToResObj(eachtodo)));
});

//2.get todo API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(covertDbObjToResObj(todo));
});
//3.get agenda API
app.get("/agenda/", checkIsValid, async (request, response) => {
  const { date } = request.query;
  var formatDate = format(new Date(date), "yyyy-MM-dd");
  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      due_date = '${formatDate}';`;
  const todo1 = await db.get(getTodoQuery);

  response.send(covertDbObjToResObj(todo1));
});

//4.post todo API
app.post("/todos/", checkIsValid, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${dueDate}');`;
  await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

//5.update todo API
app.put("/todos/:todoId/", checkIsValid, async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  const updateTodoQuery = `
      UPDATE
        todo
      SET
        todo='${todo}',
        priority='${priority}',
        status='${status}',
        category = '${category}',
        due_date = '${dueDate}'
      WHERE
        id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

//7.delete todo API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
