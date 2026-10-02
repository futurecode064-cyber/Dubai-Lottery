import concurrent.futures
import datetime as dt
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from core import Store, Error, MULTIPLIERS, MAX_BALANCE

BEFORE = dt.datetime(2026,10,2,10,0,tzinfo=dt.timezone.utc)  # 16:30 Myanmar
CUTOFF = dt.datetime(2026,10,2,11,30,tzinfo=dt.timezone.utc)  # 18:00 Myanmar
AFTER = CUTOFF + dt.timedelta(seconds=1)

class CoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.temp.name)/'test.sqlite3')
        self.admin = self.store.create_user('admin','admin_password_123',role='admin')
        self.player = self.store.create_user('alice','player_password_123',actor=self.admin)
        self.store.adjust(self.admin,self.player,10000,'Initial test credits','initial_key_123456789')
        self.store.ensure_day(BEFORE)
        self.draws = {x['market']:x['id'] for x in self.store.state(self.player,BEFORE)['draws']}

    def tearDown(self): self.temp.cleanup()
    def balance(self): return self.store.state(self.player,BEFORE)['account']['balance']
    def bet(self, market='2D', number='07', amount=10, key='bet_key_1234567890', at=BEFORE):
        return self.store.place(self.player,self.draws[market],number,amount,key,at)

    def test_all_multipliers_and_leading_zeroes(self):
        for market,number in [('2D','07'),('3D','007'),('4D','0007')]:
            before=self.balance()
            self.bet(market,number,10,market+'_test_key_123456')
            self.assertEqual(self.balance(),before-10)
            result=self.store.settle(self.admin,self.draws[market],number,'Published test source',AFTER)
            self.assertEqual(result['payout'],10*MULTIPLIERS[market])
            self.assertEqual(self.balance(),before-10+10*MULTIPLIERS[market])

    def test_nonwinner_and_repeat_settlement(self):
        self.bet()
        self.store.settle(self.admin,self.draws['2D'],'08','Published source',AFTER)
        self.assertEqual(self.balance(),9990)
        self.assertTrue(self.store.settle(self.admin,self.draws['2D'],'08','Published source',AFTER)['duplicate'])
        self.assertEqual(self.balance(),9990)
        with self.assertRaises(Error): self.store.settle(self.admin,self.draws['2D'],'07','Published source',AFTER)

    def test_winner_paid_once(self):
        self.bet()
        for _ in range(3): self.store.settle(self.admin,self.draws['2D'],'07','Published source',AFTER)
        self.assertEqual(self.balance(),10790)
        with self.store.connection() as c:
            self.assertEqual(c.execute("SELECT COUNT(*) FROM ledger WHERE kind='win'").fetchone()[0],1)

    def test_duplicate_entry_and_payload_conflict(self):
        a=self.bet()
        b=self.bet()
        self.assertEqual(a['bet_id'],b['bet_id'])
        self.assertTrue(b['duplicate'])
        self.assertEqual(self.balance(),9990)
        with self.assertRaises(Error): self.bet(number='08')

    def test_insufficient_funds_rolls_back_entry(self):
        with self.assertRaises(Error): self.bet(amount=10001)
        self.assertEqual(self.balance(),10000)
        self.assertEqual(len(self.store.state(self.player,BEFORE)['bets']),0)

    def test_cutoff_is_inclusive_and_results_are_locked_until_cutoff(self):
        with self.assertRaises(Error): self.bet(at=CUTOFF)
        with self.assertRaises(Error): self.store.settle(self.admin,self.draws['2D'],'07','Published source',BEFORE)
        self.bet(at=CUTOFF-dt.timedelta(microseconds=1))
        self.store.settle(self.admin,self.draws['2D'],'07','Published source',CUTOFF)
        self.assertEqual(self.balance(),10790)

    def test_expired_draws_close_and_three_draws_per_day(self):
        self.store.ensure_day(AFTER)
        self.store.ensure_day(AFTER)
        with self.store.connection() as c:
            self.assertEqual(c.execute('SELECT COUNT(*) FROM draws').fetchone()[0],3)
            self.assertEqual(c.execute("SELECT COUNT(*) FROM draws WHERE status='closed'").fetchone()[0],3)

    def test_next_day_has_separate_draws(self):
        self.store.ensure_day(BEFORE+dt.timedelta(days=1))
        with self.store.connection() as c:
            self.assertEqual(c.execute('SELECT COUNT(*) FROM draws').fetchone()[0],6)

    def test_malformed_number_and_stakes(self):
        for number in ['7','007','-7','７７','AA',7,None]:
            with self.subTest(number=number),self.assertRaises(Error): self.bet(number=number)
        for amount in [0,-1,True,0.5,'10',100001]:
            with self.subTest(amount=amount),self.assertRaises(Error): self.bet(amount=amount)
        self.assertEqual(self.balance(),10000)

    def test_player_cannot_adjust_create_or_settle(self):
        with self.assertRaises(Error): self.store.adjust(self.player,self.player,100,'Invalid adjustment','invalid_key_12345678')
        with self.assertRaises(Error): self.store.create_user('bob','secure_password_123',actor=self.player)
        with self.assertRaises(Error): self.store.settle(self.player,self.draws['2D'],'07','Test source',AFTER)
        with self.assertRaises(Error): self.store.place(self.admin,self.draws['2D'],'07',10,'admin_bet_key_12345',BEFORE)

    def test_adjustment_idempotency_and_negative_balances(self):
        for _ in range(3): self.store.adjust(self.admin,self.player,100,'Test topup receipt','topup_key_123456789')
        self.assertEqual(self.balance(),10100)
        with self.assertRaises(Error): self.store.adjust(self.admin,self.player,-10101,'Test deduction','deduct_key_12345678')
        with self.assertRaises(Error): self.store.adjust(self.admin,self.player,101,'Test topup receipt','topup_key_123456789')
        self.assertEqual(self.balance(),10100)

    def test_concurrent_entries_do_not_overdraw(self):
        def place(i):
            try:
                self.bet(amount=7000,key=f'concurrent_key_{i:05d}')
                return True
            except Error: return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(place,[1,2]))
        self.assertEqual(sum(results),1)
        self.assertEqual(self.balance(),3000)

    def test_concurrent_duplicate_only_deducts_once(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results=list(pool.map(lambda _:self.bet(),range(4)))
        self.assertEqual(len({r['bet_id'] for r in results}),1)
        self.assertEqual(self.balance(),9990)

    def test_concurrent_settlement_only_pays_once(self):
        self.bet()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _:self.store.settle(self.admin,self.draws['2D'],'07','Test source',AFTER),range(2)))
        self.assertEqual(self.balance(),10790)

    def test_ledger_reconciles_and_is_append_only(self):
        self.bet()
        self.store.settle(self.admin,self.draws['2D'],'07','Test source',AFTER)
        with self.store.connection() as c:
            self.assertEqual(c.execute('SELECT SUM(delta) FROM ledger WHERE user_id=?',(self.player,)).fetchone()[0],10790)
            with self.assertRaises(sqlite3.IntegrityError): c.execute('DELETE FROM ledger')
            with self.assertRaises(sqlite3.IntegrityError): c.execute("UPDATE audit SET action='changed'")

    def test_overflow_rolls_back_whole_settlement(self):
        self.bet(market='4D',number='0007',amount=10)
        with self.store.transaction() as c:
            c.execute('UPDATE users SET balance=? WHERE id=?',(MAX_BALANCE-1,self.player))
        with self.assertRaises(Error): self.store.settle(self.admin,self.draws['4D'],'0007','Test source',AFTER)
        with self.store.connection() as c:
            self.assertEqual(c.execute('SELECT payout FROM bets').fetchone()[0],0)
            self.assertIsNone(c.execute('SELECT result FROM draws WHERE id=?',(self.draws['4D'],)).fetchone()[0])
            self.assertEqual(c.execute("SELECT COUNT(*) FROM ledger WHERE kind='win'").fetchone()[0],0)

    def test_daily_limit_across_markets(self):
        self.store.preferences(self.player,15,0)
        self.bet()
        with self.assertRaises(Error): self.bet('3D','007',6,'another_key_123456')
        self.assertEqual(self.balance(),9990)

    def test_break_cannot_be_shortened_and_blocks_entries(self):
        self.store.preferences(self.player,10000,7)
        old=self.store.state(self.player,BEFORE)['account']['excluded_until']
        self.store.preferences(self.player,10000,0)
        self.assertEqual(self.store.state(self.player,BEFORE)['account']['excluded_until'],old)
        with self.assertRaises(Error): self.bet()

    def test_session_logout_and_no_plaintext_password(self):
        token=self.store.login('ALICE','player_password_123')
        self.assertEqual(self.store.authenticate(token),self.player)
        with self.store.connection() as c:
            self.assertNotEqual(c.execute('SELECT password FROM users WHERE id=?',(self.player,)).fetchone()[0],'player_password_123')
            self.assertNotEqual(c.execute('SELECT digest FROM sessions').fetchone()[0],token)
        self.store.logout(token)
        with self.assertRaises(Error): self.store.authenticate(token)
        with self.assertRaises(Error): self.store.login('alice','wrong_password_123')

if __name__=='__main__': unittest.main()
