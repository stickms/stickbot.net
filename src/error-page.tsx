import { ErrorResponse, useRouteError } from 'react-router-dom';

function ErrorPage() {
  const error = useRouteError();

  return (
    <div className="flex justify-center items-center text-3xl min-h-screen">
      Error - {' '}
      {
        (error as ErrorResponse).statusText ||
        (error as Error).message ||
        'Unknown Error'
        }
    </div>
  );
}

export default ErrorPage;
