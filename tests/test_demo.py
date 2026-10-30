import unittest, json, time
from fastapi.testclient import TestClient
from backend.app import create_app

class DemoTests(unittest.TestCase):

    def test_cancel_is_terminal_and_replay_does_not_restart(self):
        self.client.app.state.demo.delay=1
        run_id=self.create()
        response=self.client.post('/api/demo/runs/'+run_id+'/cancel')
        self.assertEqual(response.json()['state'],'cancelled')
        again=self.client.post('/api/demo/runs',json=self.body()).json()
        self.assertTrue(again['reused']);self.assertEqual(again['state'],'cancelled')
        time.sleep(.03)
        result=self.client.get('/api/demo/runs/'+run_id).json()
        self.assertEqual(result['events'][-1]['kind'],'cancelled')
        self.assertNotIn('completed',[event['kind'] for event in result['events']])

    def setUp(self):
        self.client = TestClient(create_app(delay=0.001))
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)

    def body(self):
        return dict(request_id='req-demo-fixture-00000001', project_id='DEMO-001', question='人工协议测试')

    def create(self):
        response = self.client.post('/api/demo/runs', json=self.body())
        self.assertEqual(response.status_code, 202)
        return response.json()['run_id']

    def finish(self, run_id):
        for _ in range(100):
            value = self.client.get('/api/demo/runs/' + run_id).json()
            if value['state'] == 'completed':
                return value
            time.sleep(0.005)
        self.fail('demo did not complete')

    def test_idempotency_replays_one_execution_and_conflict_rejects(self):
        run_id = self.create()
        again = self.client.post('/api/demo/runs', json=self.body()).json()
        self.assertEqual(again['run_id'], run_id)
        self.assertTrue(again['reused'])
        self.assertEqual(len(self.client.app.state.demo.runs), 1)
        self.assertEqual(self.client.post('/api/demo/runs', json=dict(self.body(), question='changed')).status_code, 409)

    def test_project_and_unknown_fields_rejected(self):
        self.assertEqual(self.client.post('/api/demo/runs', json=dict(self.body(), project_id='REAL-PROJECT')).status_code, 422)
        self.assertEqual(self.client.post('/api/demo/runs', json=dict(self.body(), path='/private/input')).status_code, 422)

    def test_sse_is_ordered_and_resumes_from_cursor(self):
        run_id = self.create()
        full = self.finish(run_id)
        self.assertEqual(full['model_calls'], 0)
        response = self.client.get('/api/demo/runs/' + run_id + '/events', headers={'Last-Event-ID': '3'})
        events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]
        self.assertEqual(events[0]['sequence'], 4)
        self.assertEqual(events[-1]['kind'], 'completed')
        self.assertEqual([e['sequence'] for e in events], list(range(4, len(full['events']) + 1)))

    def test_bad_cursor_and_unknown_run_not_success(self):
        run_id = self.create()
        self.assertEqual(self.client.get('/api/demo/runs/' + run_id + '/events', headers={'Last-Event-ID': '9999'}).status_code, 422)
        self.assertEqual(self.client.get('/api/demo/runs/missing').status_code, 404)

    def test_demo_is_explicit_and_cors_does_not_allow_remote_origin(self):
        value = self.client.get('/api/demo/health').json()
        self.assertFalse(value['production_connected'])
        self.assertEqual(value['model_calls'], 0)
        response = self.client.options('/api/demo/runs', headers={'Origin': 'https://untrusted.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'})
        self.assertNotIn('access-control-allow-origin', response.headers)
if __name__ == '__main__':
    unittest.main()
