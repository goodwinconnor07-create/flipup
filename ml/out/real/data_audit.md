# Data audit

All input NPZ files were opened with allow_pickle=False. Files above 0.5% exploitability are excluded. Unreadable files are listed, never treated as zero-error examples.

The six unresolved questions are answered by distinct_boards and intersection_all_six_spots (1), spots/root_range_mismatches (2), root_range_ev_sums and fold_ev_distribution_bb (3), node_counts and max_action_count (4), unreadable and dropped_exploitability_gt_0_5 (5), and spots/pots and stacks (6). Fixture answers do not resolve these questions for the inaccessible real library.

Root ranges are reconstructed at the first node for each actor before that actor has acted. Opponent actions cannot alter that actor's own reach. Blocked combos are excluded from cross-board comparisons. Root zero-sum uses compatible-opponent-weighted realization summaries, not an unweighted average of hand EVs.

EV offset: solver.cpp normalizes cfv / compatible opponent mass + current-node contribution. At a fold, cfv includes the negative prior contribution, cancelling to zero. Thus action values exclude already-invested chips at the current node; root range values sum to the starting pot. All evaluation centres EV per hand regardless.

```json
{
  "source": "ml/data/flops",
  "synthetic": false,
  "files_per_spot": {
    "btn_bb": 239,
    "co_bb": 239,
    "utg_bb": 234,
    "sb_bb": 238,
    "sb_limp": 235,
    "bb_btn_3bet": 238
  },
  "unreadable": [],
  "dropped_exploitability_gt_0_5": [
    "ml/data/flops/sb_bb/8h8d8c.npz"
  ],
  "retained_files": 1422,
  "spots": {
    "btn_bb": {
      "files": 239,
      "pots": [
        5.5
      ],
      "stacks": [
        97.5
      ],
      "root_range_mismatches": [],
      "shared_combo_comparisons": {
        "0": 279738,
        "1": 279738
      },
      "combo_count_distribution": {
        "0": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        },
        "1": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        }
      },
      "note": "Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality."
    },
    "co_bb": {
      "files": 239,
      "pots": [
        5.1
      ],
      "stacks": [
        97.7
      ],
      "root_range_mismatches": [],
      "shared_combo_comparisons": {
        "0": 279738,
        "1": 279738
      },
      "combo_count_distribution": {
        "0": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        },
        "1": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        }
      },
      "note": "Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality."
    },
    "utg_bb": {
      "files": 234,
      "pots": [
        5.1
      ],
      "stacks": [
        97.7
      ],
      "root_range_mismatches": [],
      "shared_combo_comparisons": {
        "0": 273858,
        "1": 273858
      },
      "combo_count_distribution": {
        "0": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        },
        "1": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        }
      },
      "note": "Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality."
    },
    "sb_bb": {
      "files": 238,
      "pots": [
        6.0
      ],
      "stacks": [
        97.0
      ],
      "root_range_mismatches": [],
      "shared_combo_comparisons": {
        "0": 278562,
        "1": 278562
      },
      "combo_count_distribution": {
        "0": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        },
        "1": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        }
      },
      "note": "Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality."
    },
    "sb_limp": {
      "files": 235,
      "pots": [
        2.0
      ],
      "stacks": [
        99.0
      ],
      "root_range_mismatches": [],
      "shared_combo_comparisons": {
        "0": 275034,
        "1": 275034
      },
      "combo_count_distribution": {
        "0": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        },
        "1": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        }
      },
      "note": "Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality."
    },
    "bb_btn_3bet": {
      "files": 238,
      "pots": [
        20.5
      ],
      "stacks": [
        90.0
      ],
      "root_range_mismatches": [],
      "shared_combo_comparisons": {
        "0": 278562,
        "1": 128504
      },
      "combo_count_distribution": {
        "0": {
          "min": 1176.0,
          "p25": 1176.0,
          "median": 1176.0,
          "p75": 1176.0,
          "max": 1176.0
        },
        "1": {
          "min": 481.0,
          "p25": 531.0,
          "median": 545.0,
          "p75": 555.0,
          "max": 578.0
        }
      },
      "note": "Board blockers change combo arrays: compare root weights on overlapping unblocked combos, not raw array equality."
    }
  },
  "distinct_boards": 239,
  "intersection_all_six_spots": 234,
  "pairwise_intersections": {
    "btn_bb/co_bb": 239,
    "btn_bb/utg_bb": 234,
    "btn_bb/sb_bb": 238,
    "btn_bb/sb_limp": 235,
    "btn_bb/bb_btn_3bet": 238,
    "co_bb/utg_bb": 234,
    "co_bb/sb_bb": 238,
    "co_bb/sb_limp": 235,
    "co_bb/bb_btn_3bet": 238,
    "utg_bb/sb_bb": 234,
    "utg_bb/sb_limp": 234,
    "utg_bb/bb_btn_3bet": 234,
    "sb_bb/sb_limp": 235,
    "sb_bb/bb_btn_3bet": 238,
    "sb_limp/bb_btn_3bet": 235
  },
  "exploitability_pct": {
    "min": 0.21719911773841521,
    "p25": 0.337583999245487,
    "median": 0.38015435043446766,
    "p75": 0.43746464109467265,
    "max": 0.5315661890748724
  },
  "iterations": {
    "min": 50.0,
    "p25": 75.0,
    "median": 100.0,
    "p75": 100.0,
    "max": 200.0
  },
  "node_counts": {
    "18": 238,
    "8": 712,
    "17": 473
  },
  "max_action_count": 4,
  "max_strategy_sum_error": 0.00042724609375,
  "root_range_ev_sums": [
    {
      "file": "ml/data/flops/bb_btn_3bet/4h3d2c.npz",
      "sum_bb": 20.50002384185791,
      "pot_bb": 20.5,
      "error_bb": 2.384185791015625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/5h3d2c.npz",
      "sum_bb": 20.500032901763916,
      "pot_bb": 20.5,
      "error_bb": 3.2901763916015625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/5h4d2c.npz",
      "sum_bb": 20.50003147125244,
      "pot_bb": 20.5,
      "error_bb": 3.147125244140625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/5h4d3c.npz",
      "sum_bb": 20.500039100646973,
      "pot_bb": 20.5,
      "error_bb": 3.910064697265625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6d5d3c.npz",
      "sum_bb": 20.500024795532227,
      "pot_bb": 20.5,
      "error_bb": 2.47955322265625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6h3d2c.npz",
      "sum_bb": 20.500027656555176,
      "pot_bb": 20.5,
      "error_bb": 2.765655517578125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6h4d2c.npz",
      "sum_bb": 20.500030517578125,
      "pot_bb": 20.5,
      "error_bb": 3.0517578125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6h4d3c.npz",
      "sum_bb": 20.500033378601074,
      "pot_bb": 20.5,
      "error_bb": 3.337860107421875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6h5d2c.npz",
      "sum_bb": 20.50002670288086,
      "pot_bb": 20.5,
      "error_bb": 2.6702880859375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6h5d3c.npz",
      "sum_bb": 20.500027179718018,
      "pot_bb": 20.5,
      "error_bb": 2.7179718017578125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/6h5d4c.npz",
      "sum_bb": 20.5000319480896,
      "pot_bb": 20.5,
      "error_bb": 3.1948089599609375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7c6c2c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7c6d6c.npz",
      "sum_bb": 20.50001859664917,
      "pot_bb": 20.5,
      "error_bb": 1.8596649169921875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h3d2c.npz",
      "sum_bb": 20.50001811981201,
      "pot_bb": 20.5,
      "error_bb": 1.811981201171875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h4d2c.npz",
      "sum_bb": 20.50001859664917,
      "pot_bb": 20.5,
      "error_bb": 1.8596649169921875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h4d3c.npz",
      "sum_bb": 20.500025272369385,
      "pot_bb": 20.5,
      "error_bb": 2.5272369384765625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h5d2c.npz",
      "sum_bb": 20.50001859664917,
      "pot_bb": 20.5,
      "error_bb": 1.8596649169921875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h5d3c.npz",
      "sum_bb": 20.50002384185791,
      "pot_bb": 20.5,
      "error_bb": 2.384185791015625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h5d4c.npz",
      "sum_bb": 20.500022411346436,
      "pot_bb": 20.5,
      "error_bb": 2.2411346435546875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h6d2c.npz",
      "sum_bb": 20.50001621246338,
      "pot_bb": 20.5,
      "error_bb": 1.621246337890625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h6d3c.npz",
      "sum_bb": 20.5000262260437,
      "pot_bb": 20.5,
      "error_bb": 2.6226043701171875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h6d4c.npz",
      "sum_bb": 20.500024795532227,
      "pot_bb": 20.5,
      "error_bb": 2.47955322265625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/7h6d5c.npz",
      "sum_bb": 20.50002670288086,
      "pot_bb": 20.5,
      "error_bb": 2.6702880859375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8c7c3c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8c7c5c.npz",
      "sum_bb": 20.500003814697266,
      "pot_bb": 20.5,
      "error_bb": 3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h3d2c.npz",
      "sum_bb": 20.500017166137695,
      "pot_bb": 20.5,
      "error_bb": 1.71661376953125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h4d2c.npz",
      "sum_bb": 20.50001621246338,
      "pot_bb": 20.5,
      "error_bb": 1.621246337890625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h4d3c.npz",
      "sum_bb": 20.50002098083496,
      "pot_bb": 20.5,
      "error_bb": 2.09808349609375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h5d2c.npz",
      "sum_bb": 20.500019073486328,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h5d3c.npz",
      "sum_bb": 20.50001811981201,
      "pot_bb": 20.5,
      "error_bb": 1.811981201171875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h5d4c.npz",
      "sum_bb": 20.500019073486328,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h6d2c.npz",
      "sum_bb": 20.500019073486328,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h6d3c.npz",
      "sum_bb": 20.50002431869507,
      "pot_bb": 20.5,
      "error_bb": 2.4318695068359375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h6d4c.npz",
      "sum_bb": 20.500022411346436,
      "pot_bb": 20.5,
      "error_bb": 2.2411346435546875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h7d2c.npz",
      "sum_bb": 20.500014781951904,
      "pot_bb": 20.5,
      "error_bb": 1.4781951904296875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h7d3c.npz",
      "sum_bb": 20.500017642974854,
      "pot_bb": 20.5,
      "error_bb": 1.7642974853515625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/8h8d8c.npz",
      "sum_bb": 20.500983715057373,
      "pot_bb": 20.5,
      "error_bb": 0.0009837150573730469
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c2d2c.npz",
      "sum_bb": 20.500017642974854,
      "pot_bb": 20.5,
      "error_bb": 1.7642974853515625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c3d3c.npz",
      "sum_bb": 20.500017642974854,
      "pot_bb": 20.5,
      "error_bb": 1.7642974853515625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c4d2c.npz",
      "sum_bb": 20.50001049041748,
      "pot_bb": 20.5,
      "error_bb": 1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c5d2c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c6d2c.npz",
      "sum_bb": 20.500015258789062,
      "pot_bb": 20.5,
      "error_bb": 1.52587890625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c6d5c.npz",
      "sum_bb": 20.500015258789062,
      "pot_bb": 20.5,
      "error_bb": 1.52587890625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c7c2c.npz",
      "sum_bb": 20.499999046325684,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c8d4c.npz",
      "sum_bb": 20.50001049041748,
      "pot_bb": 20.5,
      "error_bb": 1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9c8d8c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9d4c2c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9d5c3c.npz",
      "sum_bb": 20.50001049041748,
      "pot_bb": 20.5,
      "error_bb": 1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9d6d5c.npz",
      "sum_bb": 20.500012397766113,
      "pot_bb": 20.5,
      "error_bb": 1.239776611328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9d7d4c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9d8c3c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9d8d6c.npz",
      "sum_bb": 20.50001335144043,
      "pot_bb": 20.5,
      "error_bb": 1.33514404296875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h2d2c.npz",
      "sum_bb": 20.500020503997803,
      "pot_bb": 20.5,
      "error_bb": 2.0503997802734375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h3d2c.npz",
      "sum_bb": 20.500009536743164,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h4d2c.npz",
      "sum_bb": 20.500012397766113,
      "pot_bb": 20.5,
      "error_bb": 1.239776611328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h4d3c.npz",
      "sum_bb": 20.500011444091797,
      "pot_bb": 20.5,
      "error_bb": 1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h5d2c.npz",
      "sum_bb": 20.500009536743164,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h5d3c.npz",
      "sum_bb": 20.500009536743164,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h6d2c.npz",
      "sum_bb": 20.500011444091797,
      "pot_bb": 20.5,
      "error_bb": 1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h6d3c.npz",
      "sum_bb": 20.50001811981201,
      "pot_bb": 20.5,
      "error_bb": 1.811981201171875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h7d2c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h7d3c.npz",
      "sum_bb": 20.50001811981201,
      "pot_bb": 20.5,
      "error_bb": 1.811981201171875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h8d2c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/9h8d3c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ac4d4c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ac6c5c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ac7c4c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ac7d4c.npz",
      "sum_bb": 20.50000810623169,
      "pot_bb": 20.5,
      "error_bb": 8.106231689453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ac8d4c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AcJc2c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AcKd4c.npz",
      "sum_bb": 20.499993324279785,
      "pot_bb": 20.5,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AcQd5c.npz",
      "sum_bb": 20.500011444091797,
      "pot_bb": 20.5,
      "error_bb": 1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AcQd9c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AcQdJc.npz",
      "sum_bb": 20.49999237060547,
      "pot_bb": 20.5,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AcTd3c.npz",
      "sum_bb": 20.49998950958252,
      "pot_bb": 20.5,
      "error_bb": -1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ad4d3c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ad7c5c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ad7d4c.npz",
      "sum_bb": 20.500004291534424,
      "pot_bb": 20.5,
      "error_bb": 4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ad9d7c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AdJd7c.npz",
      "sum_bb": 20.499998092651367,
      "pot_bb": 20.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AdKdJc.npz",
      "sum_bb": 20.4999942779541,
      "pot_bb": 20.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AdKdTc.npz",
      "sum_bb": 20.499990463256836,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AdQc4c.npz",
      "sum_bb": 20.50000238418579,
      "pot_bb": 20.5,
      "error_bb": 2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AdTd2c.npz",
      "sum_bb": 20.499990463256836,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AdTd6c.npz",
      "sum_bb": 20.4999942779541,
      "pot_bb": 20.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah3d2c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah4d2c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah4d3c.npz",
      "sum_bb": 20.499998092651367,
      "pot_bb": 20.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah5d2c.npz",
      "sum_bb": 20.499995231628418,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah5d3c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah6d2c.npz",
      "sum_bb": 20.499999523162842,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah6d3c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah7d2c.npz",
      "sum_bb": 20.499999523162842,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah7d3c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah8d2c.npz",
      "sum_bb": 20.500003337860107,
      "pot_bb": 20.5,
      "error_bb": 3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah8d3c.npz",
      "sum_bb": 20.500000476837158,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah9d2c.npz",
      "sum_bb": 20.499985694885254,
      "pot_bb": 20.5,
      "error_bb": -1.430511474609375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah9d3c.npz",
      "sum_bb": 20.499987602233887,
      "pot_bb": 20.5,
      "error_bb": -1.239776611328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Ah9d6c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhAd5c.npz",
      "sum_bb": 20.49998950958252,
      "pot_bb": 20.5,
      "error_bb": -1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhAd9c.npz",
      "sum_bb": 20.499990463256836,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhJd2c.npz",
      "sum_bb": 20.499988555908203,
      "pot_bb": 20.5,
      "error_bb": -1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhJd3c.npz",
      "sum_bb": 20.49998378753662,
      "pot_bb": 20.5,
      "error_bb": -1.621246337890625e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhKd2c.npz",
      "sum_bb": 20.49998950958252,
      "pot_bb": 20.5,
      "error_bb": -1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhKd3c.npz",
      "sum_bb": 20.499993801116943,
      "pot_bb": 20.5,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhQd2c.npz",
      "sum_bb": 20.499995231628418,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhQd3c.npz",
      "sum_bb": 20.4999942779541,
      "pot_bb": 20.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhTd2c.npz",
      "sum_bb": 20.499980926513672,
      "pot_bb": 20.5,
      "error_bb": -1.9073486328125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhTd3c.npz",
      "sum_bb": 20.499993324279785,
      "pot_bb": 20.5,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/AhTd4c.npz",
      "sum_bb": 20.499993324279785,
      "pot_bb": 20.5,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jc5c2c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jc5d5c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jc9c4c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jc9d2c.npz",
      "sum_bb": 20.499991416931152,
      "pot_bb": 20.5,
      "error_bb": -8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jc9d5c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jc9d7c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JcTd2c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jd5d3c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jd7c4c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jd7d4c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jd7d5c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jd8c6c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jd8d6c.npz",
      "sum_bb": 20.500009536743164,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JdJc5c.npz",
      "sum_bb": 20.500011444091797,
      "pot_bb": 20.5,
      "error_bb": 1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JdTd2c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh3d2c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh4d2c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh4d3c.npz",
      "sum_bb": 20.50001049041748,
      "pot_bb": 20.5,
      "error_bb": 1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh5d2c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh5d3c.npz",
      "sum_bb": 20.500003814697266,
      "pot_bb": 20.5,
      "error_bb": 3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh5d4c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh5d5c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh6d2c.npz",
      "sum_bb": 20.499998092651367,
      "pot_bb": 20.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh6d3c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh7d2c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh7d3c.npz",
      "sum_bb": 20.500003814697266,
      "pot_bb": 20.5,
      "error_bb": 3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh8d2c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh8d3c.npz",
      "sum_bb": 20.499999046325684,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh9d2c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Jh9d3c.npz",
      "sum_bb": 20.499995231628418,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JhJdJc.npz",
      "sum_bb": 20.500030517578125,
      "pot_bb": 20.5,
      "error_bb": 3.0517578125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JhJdTc.npz",
      "sum_bb": 20.499982833862305,
      "pot_bb": 20.5,
      "error_bb": -1.71661376953125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JhTd2c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/JhTd3c.npz",
      "sum_bb": 20.500003814697266,
      "pot_bb": 20.5,
      "error_bb": 3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kc7c6c.npz",
      "sum_bb": 20.500009536743164,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kc7d6c.npz",
      "sum_bb": 20.50000810623169,
      "pot_bb": 20.5,
      "error_bb": 8.106231689453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kc9d2c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KcJc4c.npz",
      "sum_bb": 20.499999046325684,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KcJc6c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KcTdTc.npz",
      "sum_bb": 20.499995231628418,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kd6d4c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KdJc8c.npz",
      "sum_bb": 20.500011444091797,
      "pot_bb": 20.5,
      "error_bb": 1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KdQc8c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KdQcJc.npz",
      "sum_bb": 20.499982833862305,
      "pot_bb": 20.5,
      "error_bb": -1.71661376953125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KdTc4c.npz",
      "sum_bb": 20.500003814697266,
      "pot_bb": 20.5,
      "error_bb": 3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KdTd5c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh3d2c.npz",
      "sum_bb": 20.500000476837158,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh4d2c.npz",
      "sum_bb": 20.50000524520874,
      "pot_bb": 20.5,
      "error_bb": 5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh4d3c.npz",
      "sum_bb": 20.500009059906006,
      "pot_bb": 20.5,
      "error_bb": 9.059906005859375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh5d2c.npz",
      "sum_bb": 20.500000476837158,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh5d3c.npz",
      "sum_bb": 20.50000810623169,
      "pot_bb": 20.5,
      "error_bb": 8.106231689453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh6d2c.npz",
      "sum_bb": 20.500004291534424,
      "pot_bb": 20.5,
      "error_bb": 4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh6d3c.npz",
      "sum_bb": 20.500017166137695,
      "pot_bb": 20.5,
      "error_bb": 1.71661376953125e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh7d2c.npz",
      "sum_bb": 20.4999942779541,
      "pot_bb": 20.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh7d3c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh8d2c.npz",
      "sum_bb": 20.499998569488525,
      "pot_bb": 20.5,
      "error_bb": -1.430511474609375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh8d3c.npz",
      "sum_bb": 20.500006198883057,
      "pot_bb": 20.5,
      "error_bb": 6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh8d6c.npz",
      "sum_bb": 20.50001049041748,
      "pot_bb": 20.5,
      "error_bb": 1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh9d2c.npz",
      "sum_bb": 20.499998092651367,
      "pot_bb": 20.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Kh9d3c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhJd2c.npz",
      "sum_bb": 20.49998664855957,
      "pot_bb": 20.5,
      "error_bb": -1.33514404296875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhJd3c.npz",
      "sum_bb": 20.49999237060547,
      "pot_bb": 20.5,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhKd2c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhKdKc.npz",
      "sum_bb": 20.500011444091797,
      "pot_bb": 20.5,
      "error_bb": 1.1444091796875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhQd2c.npz",
      "sum_bb": 20.4999942779541,
      "pot_bb": 20.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhQd3c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhQd7c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhTd2c.npz",
      "sum_bb": 20.499993324279785,
      "pot_bb": 20.5,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/KhTd3c.npz",
      "sum_bb": 20.499995231628418,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qc3d2c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qc7c6c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qc7d2c.npz",
      "sum_bb": 20.499985694885254,
      "pot_bb": 20.5,
      "error_bb": -1.430511474609375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qc9c4c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qc9d2c.npz",
      "sum_bb": 20.49998950958252,
      "pot_bb": 20.5,
      "error_bb": -1.049041748046875e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qc9d3c.npz",
      "sum_bb": 20.4999942779541,
      "pot_bb": 20.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QcTd2c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qd4d2c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qd6c3c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qd7c3c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qd9d5c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QdJc4c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QdQc3c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QdTc7c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QdTd7c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh3d2c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh4d2c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh4d3c.npz",
      "sum_bb": 20.50000762939453,
      "pot_bb": 20.5,
      "error_bb": 7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh5d2c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh5d3c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh5d4c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh6d2c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh6d3c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh7d2c.npz",
      "sum_bb": 20.499993324279785,
      "pot_bb": 20.5,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh7d3c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh7d4c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh7d5c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh8d2c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh8d3c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh8d6c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh8d7c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh9d2c.npz",
      "sum_bb": 20.499991416931152,
      "pot_bb": 20.5,
      "error_bb": -8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Qh9d3c.npz",
      "sum_bb": 20.499993324279785,
      "pot_bb": 20.5,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QhJd2c.npz",
      "sum_bb": 20.499990463256836,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QhJd3c.npz",
      "sum_bb": 20.499995231628418,
      "pot_bb": 20.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QhTd2c.npz",
      "sum_bb": 20.49999713897705,
      "pot_bb": 20.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QhTd3c.npz",
      "sum_bb": 20.500000953674316,
      "pot_bb": 20.5,
      "error_bb": 9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/QhTd4c.npz",
      "sum_bb": 20.499998092651367,
      "pot_bb": 20.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Tc3d3c.npz",
      "sum_bb": 20.500014305114746,
      "pot_bb": 20.5,
      "error_bb": 1.430511474609375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Tc7c2c.npz",
      "sum_bb": 20.49999237060547,
      "pot_bb": 20.5,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Tc8c3c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Td6c3c.npz",
      "sum_bb": 20.500006675720215,
      "pot_bb": 20.5,
      "error_bb": 6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Td7d5c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Td8c7c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th3d2c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th4d2c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th4d3c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th5d2c.npz",
      "sum_bb": 20.500003814697266,
      "pot_bb": 20.5,
      "error_bb": 3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th5d3c.npz",
      "sum_bb": 20.5000057220459,
      "pot_bb": 20.5,
      "error_bb": 5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th6d2c.npz",
      "sum_bb": 20.500004768371582,
      "pot_bb": 20.5,
      "error_bb": 4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th6d3c.npz",
      "sum_bb": 20.500014305114746,
      "pot_bb": 20.5,
      "error_bb": 1.430511474609375e-05
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th7d2c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th7d3c.npz",
      "sum_bb": 20.50000286102295,
      "pot_bb": 20.5,
      "error_bb": 2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th8d2c.npz",
      "sum_bb": 20.499999046325684,
      "pot_bb": 20.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th8d3c.npz",
      "sum_bb": 20.500001907348633,
      "pot_bb": 20.5,
      "error_bb": 1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th9d2c.npz",
      "sum_bb": 20.499996185302734,
      "pot_bb": 20.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th9d3c.npz",
      "sum_bb": 20.5,
      "pot_bb": 20.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/Th9d6c.npz",
      "sum_bb": 20.500008583068848,
      "pot_bb": 20.5,
      "error_bb": 8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/bb_btn_3bet/ThTd5c.npz",
      "sum_bb": 20.499991416931152,
      "pot_bb": 20.5,
      "error_bb": -8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/4h3d2c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/5h3d2c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/5h4d2c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/5h4d3c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/6d5d3c.npz",
      "sum_bb": 5.4999988079071045,
      "pot_bb": 5.5,
      "error_bb": -1.1920928955078125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/6h3d2c.npz",
      "sum_bb": 5.499997973442078,
      "pot_bb": 5.5,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/btn_bb/6h4d2c.npz",
      "sum_bb": 5.4999977350234985,
      "pot_bb": 5.5,
      "error_bb": -2.2649765014648438e-06
    },
    {
      "file": "ml/data/flops/btn_bb/6h4d3c.npz",
      "sum_bb": 5.499998092651367,
      "pot_bb": 5.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/6h5d2c.npz",
      "sum_bb": 5.500000238418579,
      "pot_bb": 5.5,
      "error_bb": 2.384185791015625e-07
    },
    {
      "file": "ml/data/flops/btn_bb/6h5d3c.npz",
      "sum_bb": 5.4999988079071045,
      "pot_bb": 5.5,
      "error_bb": -1.1920928955078125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/6h5d4c.npz",
      "sum_bb": 5.499999284744263,
      "pot_bb": 5.5,
      "error_bb": -7.152557373046875e-07
    },
    {
      "file": "ml/data/flops/btn_bb/7c6c2c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7c6d6c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h3d2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h4d2c.npz",
      "sum_bb": 5.499998092651367,
      "pot_bb": 5.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h4d3c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h5d2c.npz",
      "sum_bb": 5.4999977350234985,
      "pot_bb": 5.5,
      "error_bb": -2.2649765014648438e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h5d3c.npz",
      "sum_bb": 5.499997496604919,
      "pot_bb": 5.5,
      "error_bb": -2.5033950805664062e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h5d4c.npz",
      "sum_bb": 5.499998688697815,
      "pot_bb": 5.5,
      "error_bb": -1.3113021850585938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h6d2c.npz",
      "sum_bb": 5.499995708465576,
      "pot_bb": 5.5,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h6d3c.npz",
      "sum_bb": 5.499998927116394,
      "pot_bb": 5.5,
      "error_bb": -1.0728836059570312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/7h6d4c.npz",
      "sum_bb": 5.499999046325684,
      "pot_bb": 5.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/btn_bb/7h6d5c.npz",
      "sum_bb": 5.5,
      "pot_bb": 5.5,
      "error_bb": 0.0
    },
    {
      "file": "ml/data/flops/btn_bb/8c7c3c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8c7c5c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h3d2c.npz",
      "sum_bb": 5.499998331069946,
      "pot_bb": 5.5,
      "error_bb": -1.6689300537109375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h4d2c.npz",
      "sum_bb": 5.499997496604919,
      "pot_bb": 5.5,
      "error_bb": -2.5033950805664062e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h4d3c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h5d2c.npz",
      "sum_bb": 5.499998569488525,
      "pot_bb": 5.5,
      "error_bb": -1.430511474609375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h5d3c.npz",
      "sum_bb": 5.499998092651367,
      "pot_bb": 5.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h5d4c.npz",
      "sum_bb": 5.499998331069946,
      "pot_bb": 5.5,
      "error_bb": -1.6689300537109375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h6d2c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h6d3c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h6d4c.npz",
      "sum_bb": 5.499998569488525,
      "pot_bb": 5.5,
      "error_bb": -1.430511474609375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h7d2c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h7d3c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/8h8d8c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c2d2c.npz",
      "sum_bb": 5.5000001192092896,
      "pot_bb": 5.5,
      "error_bb": 1.1920928955078125e-07
    },
    {
      "file": "ml/data/flops/btn_bb/9c3d3c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c4d2c.npz",
      "sum_bb": 5.499996066093445,
      "pot_bb": 5.5,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c5d2c.npz",
      "sum_bb": 5.4999977350234985,
      "pot_bb": 5.5,
      "error_bb": -2.2649765014648438e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c6d2c.npz",
      "sum_bb": 5.499998092651367,
      "pot_bb": 5.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c6d5c.npz",
      "sum_bb": 5.4999988079071045,
      "pot_bb": 5.5,
      "error_bb": -1.1920928955078125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c7c2c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c8d4c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9c8d8c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9d4c2c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9d5c3c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9d6d5c.npz",
      "sum_bb": 5.499999284744263,
      "pot_bb": 5.5,
      "error_bb": -7.152557373046875e-07
    },
    {
      "file": "ml/data/flops/btn_bb/9d7d4c.npz",
      "sum_bb": 5.499995708465576,
      "pot_bb": 5.5,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9d8c3c.npz",
      "sum_bb": 5.499998331069946,
      "pot_bb": 5.5,
      "error_bb": -1.6689300537109375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9d8d6c.npz",
      "sum_bb": 5.499999523162842,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-07
    },
    {
      "file": "ml/data/flops/btn_bb/9h2d2c.npz",
      "sum_bb": 5.499997973442078,
      "pot_bb": 5.5,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h3d2c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h4d2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h4d3c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h5d2c.npz",
      "sum_bb": 5.499998688697815,
      "pot_bb": 5.5,
      "error_bb": -1.3113021850585938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h5d3c.npz",
      "sum_bb": 5.499998092651367,
      "pot_bb": 5.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h6d2c.npz",
      "sum_bb": 5.4999988079071045,
      "pot_bb": 5.5,
      "error_bb": -1.1920928955078125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h6d3c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h7d2c.npz",
      "sum_bb": 5.499997496604919,
      "pot_bb": 5.5,
      "error_bb": -2.5033950805664062e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h7d3c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h8d2c.npz",
      "sum_bb": 5.4999988079071045,
      "pot_bb": 5.5,
      "error_bb": -1.1920928955078125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/9h8d3c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ac4d4c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ac6c5c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ac7c4c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ac7d4c.npz",
      "sum_bb": 5.499994397163391,
      "pot_bb": 5.5,
      "error_bb": -5.602836608886719e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ac8d4c.npz",
      "sum_bb": 5.4999953508377075,
      "pot_bb": 5.5,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AcJc2c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AcKd4c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AcQd5c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AcQd9c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AcQdJc.npz",
      "sum_bb": 5.499994874000549,
      "pot_bb": 5.5,
      "error_bb": -5.125999450683594e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AcTd3c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ad4d3c.npz",
      "sum_bb": 5.499998331069946,
      "pot_bb": 5.5,
      "error_bb": -1.6689300537109375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ad7c5c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ad7d4c.npz",
      "sum_bb": 5.499994993209839,
      "pot_bb": 5.5,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ad9d7c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AdJd7c.npz",
      "sum_bb": 5.4999953508377075,
      "pot_bb": 5.5,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AdKdJc.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AdKdTc.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AdQc4c.npz",
      "sum_bb": 5.4999940395355225,
      "pot_bb": 5.5,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AdTd2c.npz",
      "sum_bb": 5.499998211860657,
      "pot_bb": 5.5,
      "error_bb": -1.7881393432617188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AdTd6c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah3d2c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah4d2c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah4d3c.npz",
      "sum_bb": 5.4999940395355225,
      "pot_bb": 5.5,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah5d2c.npz",
      "sum_bb": 5.499997973442078,
      "pot_bb": 5.5,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah5d3c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah6d2c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah6d3c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah7d2c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah7d3c.npz",
      "sum_bb": 5.499996542930603,
      "pot_bb": 5.5,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah8d2c.npz",
      "sum_bb": 5.499997496604919,
      "pot_bb": 5.5,
      "error_bb": -2.5033950805664062e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah8d3c.npz",
      "sum_bb": 5.499998331069946,
      "pot_bb": 5.5,
      "error_bb": -1.6689300537109375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah9d2c.npz",
      "sum_bb": 5.4999977350234985,
      "pot_bb": 5.5,
      "error_bb": -2.2649765014648438e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah9d3c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Ah9d6c.npz",
      "sum_bb": 5.499994277954102,
      "pot_bb": 5.5,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhAd5c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhAd9c.npz",
      "sum_bb": 5.499997973442078,
      "pot_bb": 5.5,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhJd2c.npz",
      "sum_bb": 5.4999953508377075,
      "pot_bb": 5.5,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhJd3c.npz",
      "sum_bb": 5.499995470046997,
      "pot_bb": 5.5,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhKd2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhKd3c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhQd2c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhQd3c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhTd2c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhTd3c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/AhTd4c.npz",
      "sum_bb": 5.499995708465576,
      "pot_bb": 5.5,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jc5c2c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jc5d5c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jc9c4c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jc9d2c.npz",
      "sum_bb": 5.499999284744263,
      "pot_bb": 5.5,
      "error_bb": -7.152557373046875e-07
    },
    {
      "file": "ml/data/flops/btn_bb/Jc9d5c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jc9d7c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/JcTd2c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jd5d3c.npz",
      "sum_bb": 5.4999964237213135,
      "pot_bb": 5.5,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jd7c4c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jd7d4c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jd7d5c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jd8c6c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jd8d6c.npz",
      "sum_bb": 5.499995589256287,
      "pot_bb": 5.5,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/btn_bb/JdJc5c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/JdTd2c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh3d2c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh4d2c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh4d3c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh5d2c.npz",
      "sum_bb": 5.499998331069946,
      "pot_bb": 5.5,
      "error_bb": -1.6689300537109375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh5d3c.npz",
      "sum_bb": 5.499998211860657,
      "pot_bb": 5.5,
      "error_bb": -1.7881393432617188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh5d4c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh5d5c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh6d2c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh6d3c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh7d2c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh7d3c.npz",
      "sum_bb": 5.4999953508377075,
      "pot_bb": 5.5,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh8d2c.npz",
      "sum_bb": 5.499999046325684,
      "pot_bb": 5.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/btn_bb/Jh8d3c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh9d2c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Jh9d3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/JhJdJc.npz",
      "sum_bb": 5.499999403953552,
      "pot_bb": 5.5,
      "error_bb": -5.960464477539062e-07
    },
    {
      "file": "ml/data/flops/btn_bb/JhJdTc.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/JhTd2c.npz",
      "sum_bb": 5.4999977350234985,
      "pot_bb": 5.5,
      "error_bb": -2.2649765014648438e-06
    },
    {
      "file": "ml/data/flops/btn_bb/JhTd3c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kc7c6c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kc7d6c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kc9d2c.npz",
      "sum_bb": 5.499998092651367,
      "pot_bb": 5.5,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KcJc4c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KcJc6c.npz",
      "sum_bb": 5.4999964237213135,
      "pot_bb": 5.5,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KcTdTc.npz",
      "sum_bb": 5.4999964237213135,
      "pot_bb": 5.5,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kd6d4c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kd9d5c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KdJc8c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KdQc8c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KdQcJc.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KdTc4c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KdTd5c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh3d2c.npz",
      "sum_bb": 5.499994993209839,
      "pot_bb": 5.5,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh4d2c.npz",
      "sum_bb": 5.499995112419128,
      "pot_bb": 5.5,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh4d3c.npz",
      "sum_bb": 5.499997019767761,
      "pot_bb": 5.5,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh5d2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh5d3c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh6d2c.npz",
      "sum_bb": 5.499993681907654,
      "pot_bb": 5.5,
      "error_bb": -6.318092346191406e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh6d3c.npz",
      "sum_bb": 5.499997973442078,
      "pot_bb": 5.5,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh7d2c.npz",
      "sum_bb": 5.49999463558197,
      "pot_bb": 5.5,
      "error_bb": -5.364418029785156e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh7d3c.npz",
      "sum_bb": 5.499996542930603,
      "pot_bb": 5.5,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh8d2c.npz",
      "sum_bb": 5.499994516372681,
      "pot_bb": 5.5,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh8d3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh8d6c.npz",
      "sum_bb": 5.499995470046997,
      "pot_bb": 5.5,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh9d2c.npz",
      "sum_bb": 5.499998450279236,
      "pot_bb": 5.5,
      "error_bb": -1.5497207641601562e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Kh9d3c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhJd2c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhJd3c.npz",
      "sum_bb": 5.49999725818634,
      "pot_bb": 5.5,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhKd2c.npz",
      "sum_bb": 5.499995112419128,
      "pot_bb": 5.5,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhKdKc.npz",
      "sum_bb": 5.499995112419128,
      "pot_bb": 5.5,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhQd2c.npz",
      "sum_bb": 5.499996542930603,
      "pot_bb": 5.5,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhQd3c.npz",
      "sum_bb": 5.499998927116394,
      "pot_bb": 5.5,
      "error_bb": -1.0728836059570312e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhQd7c.npz",
      "sum_bb": 5.4999953508377075,
      "pot_bb": 5.5,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhTd2c.npz",
      "sum_bb": 5.499996185302734,
      "pot_bb": 5.5,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/KhTd3c.npz",
      "sum_bb": 5.499994874000549,
      "pot_bb": 5.5,
      "error_bb": -5.125999450683594e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qc3d2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qc7c6c.npz",
      "sum_bb": 5.4999964237213135,
      "pot_bb": 5.5,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qc7d2c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qc9c4c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qc9d2c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qc9d3c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QcTd2c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qd4d2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qd6c3c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qd7c3c.npz",
      "sum_bb": 5.499996066093445,
      "pot_bb": 5.5,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qd9d5c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QdJc4c.npz",
      "sum_bb": 5.499995827674866,
      "pot_bb": 5.5,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QdQc3c.npz",
      "sum_bb": 5.499993443489075,
      "pot_bb": 5.5,
      "error_bb": -6.556510925292969e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QdTc7c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QdTd7c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh3d2c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh4d2c.npz",
      "sum_bb": 5.499995708465576,
      "pot_bb": 5.5,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh4d3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh5d2c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh5d3c.npz",
      "sum_bb": 5.499999046325684,
      "pot_bb": 5.5,
      "error_bb": -9.5367431640625e-07
    },
    {
      "file": "ml/data/flops/btn_bb/Qh5d4c.npz",
      "sum_bb": 5.4999977350234985,
      "pot_bb": 5.5,
      "error_bb": -2.2649765014648438e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh6d2c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh6d3c.npz",
      "sum_bb": 5.499995112419128,
      "pot_bb": 5.5,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh7d2c.npz",
      "sum_bb": 5.4999940395355225,
      "pot_bb": 5.5,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh7d3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh7d4c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh7d5c.npz",
      "sum_bb": 5.499997973442078,
      "pot_bb": 5.5,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh8d2c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh8d3c.npz",
      "sum_bb": 5.499996781349182,
      "pot_bb": 5.5,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh8d6c.npz",
      "sum_bb": 5.499996066093445,
      "pot_bb": 5.5,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh8d7c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh9d2c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Qh9d3c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QhJd2c.npz",
      "sum_bb": 5.499995589256287,
      "pot_bb": 5.5,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QhJd3c.npz",
      "sum_bb": 5.499995231628418,
      "pot_bb": 5.5,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QhTd2c.npz",
      "sum_bb": 5.499995589256287,
      "pot_bb": 5.5,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QhTd3c.npz",
      "sum_bb": 5.4999940395355225,
      "pot_bb": 5.5,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/QhTd4c.npz",
      "sum_bb": 5.499994158744812,
      "pot_bb": 5.5,
      "error_bb": -5.841255187988281e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Tc3d3c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Tc7c2c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Tc8c3c.npz",
      "sum_bb": 5.49999737739563,
      "pot_bb": 5.5,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Td6c3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Td7d5c.npz",
      "sum_bb": 5.4999964237213135,
      "pot_bb": 5.5,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Td8c7c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th3d2c.npz",
      "sum_bb": 5.4999940395355225,
      "pot_bb": 5.5,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th4d2c.npz",
      "sum_bb": 5.499997496604919,
      "pot_bb": 5.5,
      "error_bb": -2.5033950805664062e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th4d3c.npz",
      "sum_bb": 5.499996542930603,
      "pot_bb": 5.5,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th5d2c.npz",
      "sum_bb": 5.499996662139893,
      "pot_bb": 5.5,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th5d3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th6d2c.npz",
      "sum_bb": 5.499998450279236,
      "pot_bb": 5.5,
      "error_bb": -1.5497207641601562e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th6d3c.npz",
      "sum_bb": 5.499995946884155,
      "pot_bb": 5.5,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th7d2c.npz",
      "sum_bb": 5.499996304512024,
      "pot_bb": 5.5,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th7d3c.npz",
      "sum_bb": 5.499995470046997,
      "pot_bb": 5.5,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th8d2c.npz",
      "sum_bb": 5.499997615814209,
      "pot_bb": 5.5,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th8d3c.npz",
      "sum_bb": 5.499996900558472,
      "pot_bb": 5.5,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th9d2c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th9d3c.npz",
      "sum_bb": 5.499997138977051,
      "pot_bb": 5.5,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/btn_bb/Th9d6c.npz",
      "sum_bb": 5.499998569488525,
      "pot_bb": 5.5,
      "error_bb": -1.430511474609375e-06
    },
    {
      "file": "ml/data/flops/btn_bb/ThTd5c.npz",
      "sum_bb": 5.499997854232788,
      "pot_bb": 5.5,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/co_bb/4h3d2c.npz",
      "sum_bb": 5.099993348121643,
      "pot_bb": 5.1,
      "error_bb": -6.651878356578322e-06
    },
    {
      "file": "ml/data/flops/co_bb/5h3d2c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/5h4d2c.npz",
      "sum_bb": 5.099990367889404,
      "pot_bb": 5.1,
      "error_bb": -9.632110595347854e-06
    },
    {
      "file": "ml/data/flops/co_bb/5h4d3c.npz",
      "sum_bb": 5.0999932289123535,
      "pot_bb": 5.1,
      "error_bb": -6.771087646129104e-06
    },
    {
      "file": "ml/data/flops/co_bb/6d5d3c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/6h3d2c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/co_bb/6h4d2c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/6h4d3c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/6h5d2c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/6h5d3c.npz",
      "sum_bb": 5.099992632865906,
      "pot_bb": 5.1,
      "error_bb": -7.36713409388301e-06
    },
    {
      "file": "ml/data/flops/co_bb/6h5d4c.npz",
      "sum_bb": 5.0999915599823,
      "pot_bb": 5.1,
      "error_bb": -8.440017699840041e-06
    },
    {
      "file": "ml/data/flops/co_bb/7c6c2c.npz",
      "sum_bb": 5.0999915599823,
      "pot_bb": 5.1,
      "error_bb": -8.440017699840041e-06
    },
    {
      "file": "ml/data/flops/co_bb/7c6d6c.npz",
      "sum_bb": 5.0999908447265625,
      "pot_bb": 5.1,
      "error_bb": -9.155273437144729e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h3d2c.npz",
      "sum_bb": 5.099990963935852,
      "pot_bb": 5.1,
      "error_bb": -9.036064147593947e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h4d2c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h4d3c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h5d2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h5d3c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h5d4c.npz",
      "sum_bb": 5.0999932289123535,
      "pot_bb": 5.1,
      "error_bb": -6.771087646129104e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h6d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h6d3c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h6d4c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/7h6d5c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/8c7c3c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/8c7c5c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h3d2c.npz",
      "sum_bb": 5.0999908447265625,
      "pot_bb": 5.1,
      "error_bb": -9.155273437144729e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h4d2c.npz",
      "sum_bb": 5.099992632865906,
      "pot_bb": 5.1,
      "error_bb": -7.36713409388301e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h4d3c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h5d2c.npz",
      "sum_bb": 5.099993824958801,
      "pot_bb": 5.1,
      "error_bb": -6.175041198375197e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h5d3c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h5d4c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h6d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h6d3c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h6d4c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h7d2c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h7d3c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/8h8d8c.npz",
      "sum_bb": 5.099988698959351,
      "pot_bb": 5.1,
      "error_bb": -1.1301040649058791e-05
    },
    {
      "file": "ml/data/flops/co_bb/9c2d2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c3d3c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c4d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c5d2c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c6d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c6d5c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c7c2c.npz",
      "sum_bb": 5.0999915599823,
      "pot_bb": 5.1,
      "error_bb": -8.440017699840041e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c8d4c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/9c8d8c.npz",
      "sum_bb": 5.099991083145142,
      "pot_bb": 5.1,
      "error_bb": -8.916854858043166e-06
    },
    {
      "file": "ml/data/flops/co_bb/9d4c2c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/9d5c3c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/9d6d5c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/9d7d4c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/9d8c3c.npz",
      "sum_bb": 5.099991202354431,
      "pot_bb": 5.1,
      "error_bb": -8.797645568492385e-06
    },
    {
      "file": "ml/data/flops/co_bb/9d8d6c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h2d2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h3d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h4d2c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h4d3c.npz",
      "sum_bb": 5.0999915599823,
      "pot_bb": 5.1,
      "error_bb": -8.440017699840041e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h5d2c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h5d3c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h6d2c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h6d3c.npz",
      "sum_bb": 5.099990367889404,
      "pot_bb": 5.1,
      "error_bb": -9.632110595347854e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h7d2c.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h7d3c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h8d2c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/co_bb/9h8d3c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ac4d4c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ac6c5c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ac7c4c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ac7d4c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ac8d4c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/AcJc2c.npz",
      "sum_bb": 5.099997162818909,
      "pot_bb": 5.1,
      "error_bb": -2.8371810909533224e-06
    },
    {
      "file": "ml/data/flops/co_bb/AcKd4c.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/co_bb/AcQd5c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/AcQd9c.npz",
      "sum_bb": 5.099990963935852,
      "pot_bb": 5.1,
      "error_bb": -9.036064147593947e-06
    },
    {
      "file": "ml/data/flops/co_bb/AcQdJc.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/AcTd3c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ad4d3c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ad7c5c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ad7d4c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ad9d7c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/AdJd7c.npz",
      "sum_bb": 5.0999932289123535,
      "pot_bb": 5.1,
      "error_bb": -6.771087646129104e-06
    },
    {
      "file": "ml/data/flops/co_bb/AdKdJc.npz",
      "sum_bb": 5.099993348121643,
      "pot_bb": 5.1,
      "error_bb": -6.651878356578322e-06
    },
    {
      "file": "ml/data/flops/co_bb/AdKdTc.npz",
      "sum_bb": 5.099990010261536,
      "pot_bb": 5.1,
      "error_bb": -9.989738464000197e-06
    },
    {
      "file": "ml/data/flops/co_bb/AdQc4c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/co_bb/AdTd2c.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/co_bb/AdTd6c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah3d2c.npz",
      "sum_bb": 5.099990725517273,
      "pot_bb": 5.1,
      "error_bb": -9.27448272669551e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah4d2c.npz",
      "sum_bb": 5.099995493888855,
      "pot_bb": 5.1,
      "error_bb": -4.50611114466426e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah4d3c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah5d2c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah5d3c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah6d2c.npz",
      "sum_bb": 5.099996328353882,
      "pot_bb": 5.1,
      "error_bb": -3.671646117808791e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah6d3c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah7d2c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah7d3c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah8d2c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah8d3c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah9d2c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah9d3c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/Ah9d6c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhAd5c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhAd9c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhJd2c.npz",
      "sum_bb": 5.099995255470276,
      "pot_bb": 5.1,
      "error_bb": -4.744529723765822e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhJd3c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhKd2c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhKd3c.npz",
      "sum_bb": 5.0999932289123535,
      "pot_bb": 5.1,
      "error_bb": -6.771087646129104e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhQd2c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhQd3c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhTd2c.npz",
      "sum_bb": 5.099996566772461,
      "pot_bb": 5.1,
      "error_bb": -3.4332275387072286e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhTd3c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/AhTd4c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jc5c2c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jc5d5c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jc9c4c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jc9d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jc9d5c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jc9d7c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/JcTd2c.npz",
      "sum_bb": 5.099992632865906,
      "pot_bb": 5.1,
      "error_bb": -7.36713409388301e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jd5d3c.npz",
      "sum_bb": 5.099993348121643,
      "pot_bb": 5.1,
      "error_bb": -6.651878356578322e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jd7c4c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jd7d4c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jd7d5c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jd8c6c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jd8d6c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/JdJc5c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/JdTd2c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh3d2c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh4d2c.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh4d3c.npz",
      "sum_bb": 5.099992632865906,
      "pot_bb": 5.1,
      "error_bb": -7.36713409388301e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh5d2c.npz",
      "sum_bb": 5.099995970726013,
      "pot_bb": 5.1,
      "error_bb": -4.029273986461135e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh5d3c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh5d4c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh5d5c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh6d2c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh6d3c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh7d2c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh7d3c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh8d2c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh8d3c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh9d2c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/Jh9d3c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/JhJdJc.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/co_bb/JhJdTc.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/JhTd2c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/JhTd3c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kc7c6c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kc7d6c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kc9d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/KcJc4c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/KcJc6c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/KcTdTc.npz",
      "sum_bb": 5.099990248680115,
      "pot_bb": 5.1,
      "error_bb": -9.751319884898635e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kd6d4c.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kd9d5c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/KdJc8c.npz",
      "sum_bb": 5.0999908447265625,
      "pot_bb": 5.1,
      "error_bb": -9.155273437144729e-06
    },
    {
      "file": "ml/data/flops/co_bb/KdQc8c.npz",
      "sum_bb": 5.099990129470825,
      "pot_bb": 5.1,
      "error_bb": -9.870529174449416e-06
    },
    {
      "file": "ml/data/flops/co_bb/KdQcJc.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/KdTc4c.npz",
      "sum_bb": 5.099990129470825,
      "pot_bb": 5.1,
      "error_bb": -9.870529174449416e-06
    },
    {
      "file": "ml/data/flops/co_bb/KdTd5c.npz",
      "sum_bb": 5.099989175796509,
      "pot_bb": 5.1,
      "error_bb": -1.0824203490855666e-05
    },
    {
      "file": "ml/data/flops/co_bb/Kh3d2c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh4d2c.npz",
      "sum_bb": 5.099992632865906,
      "pot_bb": 5.1,
      "error_bb": -7.36713409388301e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh4d3c.npz",
      "sum_bb": 5.099990725517273,
      "pot_bb": 5.1,
      "error_bb": -9.27448272669551e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh5d2c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh5d3c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh6d2c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh6d3c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh7d2c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh7d3c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh8d2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh8d3c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh8d6c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh9d2c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/Kh9d3c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhJd2c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhJd3c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhKd2c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhKdKc.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhQd2c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhQd3c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhQd7c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhTd2c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/co_bb/KhTd3c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qc3d2c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qc7c6c.npz",
      "sum_bb": 5.099990367889404,
      "pot_bb": 5.1,
      "error_bb": -9.632110595347854e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qc7d2c.npz",
      "sum_bb": 5.099991202354431,
      "pot_bb": 5.1,
      "error_bb": -8.797645568492385e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qc9c4c.npz",
      "sum_bb": 5.099991202354431,
      "pot_bb": 5.1,
      "error_bb": -8.797645568492385e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qc9d2c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qc9d3c.npz",
      "sum_bb": 5.099993348121643,
      "pot_bb": 5.1,
      "error_bb": -6.651878356578322e-06
    },
    {
      "file": "ml/data/flops/co_bb/QcTd2c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qd4d2c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qd6c3c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qd7c3c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qd9d5c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/QdJc4c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/co_bb/QdQc3c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/QdTc7c.npz",
      "sum_bb": 5.099990606307983,
      "pot_bb": 5.1,
      "error_bb": -9.393692016246291e-06
    },
    {
      "file": "ml/data/flops/co_bb/QdTd7c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh3d2c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh4d2c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh4d3c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh5d2c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh5d3c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh5d4c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh6d2c.npz",
      "sum_bb": 5.0999932289123535,
      "pot_bb": 5.1,
      "error_bb": -6.771087646129104e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh6d3c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh7d2c.npz",
      "sum_bb": 5.0999908447265625,
      "pot_bb": 5.1,
      "error_bb": -9.155273437144729e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh7d3c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh7d4c.npz",
      "sum_bb": 5.099991321563721,
      "pot_bb": 5.1,
      "error_bb": -8.678436278941604e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh7d5c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh8d2c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh8d3c.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh8d6c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh8d7c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh9d2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/Qh9d3c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/co_bb/QhJd2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/co_bb/QhJd3c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/QhTd2c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/QhTd3c.npz",
      "sum_bb": 5.099991083145142,
      "pot_bb": 5.1,
      "error_bb": -8.916854858043166e-06
    },
    {
      "file": "ml/data/flops/co_bb/QhTd4c.npz",
      "sum_bb": 5.099990963935852,
      "pot_bb": 5.1,
      "error_bb": -9.036064147593947e-06
    },
    {
      "file": "ml/data/flops/co_bb/Tc3d3c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/Tc7c2c.npz",
      "sum_bb": 5.099990963935852,
      "pot_bb": 5.1,
      "error_bb": -9.036064147593947e-06
    },
    {
      "file": "ml/data/flops/co_bb/Tc8c3c.npz",
      "sum_bb": 5.099990129470825,
      "pot_bb": 5.1,
      "error_bb": -9.870529174449416e-06
    },
    {
      "file": "ml/data/flops/co_bb/Td6c3c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/co_bb/Td7d5c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/Td8c7c.npz",
      "sum_bb": 5.099991083145142,
      "pot_bb": 5.1,
      "error_bb": -8.916854858043166e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th3d2c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th4d2c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th4d3c.npz",
      "sum_bb": 5.0999919176101685,
      "pot_bb": 5.1,
      "error_bb": -8.082389831187697e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th5d2c.npz",
      "sum_bb": 5.099992632865906,
      "pot_bb": 5.1,
      "error_bb": -7.36713409388301e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th5d3c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th6d2c.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th6d3c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th7d2c.npz",
      "sum_bb": 5.099990725517273,
      "pot_bb": 5.1,
      "error_bb": -9.27448272669551e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th7d3c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th8d2c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th8d3c.npz",
      "sum_bb": 5.099991679191589,
      "pot_bb": 5.1,
      "error_bb": -8.32080841028926e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th9d2c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th9d3c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/co_bb/Th9d6c.npz",
      "sum_bb": 5.0999915599823,
      "pot_bb": 5.1,
      "error_bb": -8.440017699840041e-06
    },
    {
      "file": "ml/data/flops/co_bb/ThTd5c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/sb_bb/4h3d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/5h3d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/5h4d2c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/5h4d3c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6d5d3c.npz",
      "sum_bb": 5.99999737739563,
      "pot_bb": 6.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6h3d2c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6h4d2c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6h4d3c.npz",
      "sum_bb": 5.9999964237213135,
      "pot_bb": 6.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6h5d2c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6h5d3c.npz",
      "sum_bb": 5.99999737739563,
      "pot_bb": 6.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/6h5d4c.npz",
      "sum_bb": 5.999997854232788,
      "pot_bb": 6.0,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7c6c2c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7c6d6c.npz",
      "sum_bb": 5.999997615814209,
      "pot_bb": 6.0,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h3d2c.npz",
      "sum_bb": 5.9999964237213135,
      "pot_bb": 6.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h4d2c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h4d3c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h5d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h5d3c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h5d4c.npz",
      "sum_bb": 5.999997854232788,
      "pot_bb": 6.0,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h6d2c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h6d3c.npz",
      "sum_bb": 5.999998092651367,
      "pot_bb": 6.0,
      "error_bb": -1.9073486328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h6d4c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/7h6d5c.npz",
      "sum_bb": 6.000000238418579,
      "pot_bb": 6.0,
      "error_bb": 2.384185791015625e-07
    },
    {
      "file": "ml/data/flops/sb_bb/8c7c3c.npz",
      "sum_bb": 5.999994277954102,
      "pot_bb": 6.0,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8c7c5c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h3d2c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h4d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h4d3c.npz",
      "sum_bb": 5.9999964237213135,
      "pot_bb": 6.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h5d2c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h5d3c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h5d4c.npz",
      "sum_bb": 5.99999737739563,
      "pot_bb": 6.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h6d2c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h6d3c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h6d4c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h7d2c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h7d3c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c2d2c.npz",
      "sum_bb": 5.9999940395355225,
      "pot_bb": 6.0,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c3d3c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c4d2c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c5d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c6d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c6d5c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c7c2c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c8d4c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9c8d8c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9d4c2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9d5c3c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9d6d5c.npz",
      "sum_bb": 5.999997615814209,
      "pot_bb": 6.0,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9d7d4c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9d8c3c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9d8d6c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h2d2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h3d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h4d2c.npz",
      "sum_bb": 5.999993562698364,
      "pot_bb": 6.0,
      "error_bb": -6.4373016357421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h4d3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h5d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h5d3c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h6d2c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h6d3c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h7d2c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h7d3c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h8d2c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/9h8d3c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ac4d4c.npz",
      "sum_bb": 5.999997615814209,
      "pot_bb": 6.0,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ac6c5c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ac7c4c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ac7d4c.npz",
      "sum_bb": 5.999993085861206,
      "pot_bb": 6.0,
      "error_bb": -6.9141387939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ac8d4c.npz",
      "sum_bb": 5.999992609024048,
      "pot_bb": 6.0,
      "error_bb": -7.3909759521484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AcJc2c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AcKd4c.npz",
      "sum_bb": 5.999992370605469,
      "pot_bb": 6.0,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AcQd5c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AcQd9c.npz",
      "sum_bb": 5.999990701675415,
      "pot_bb": 6.0,
      "error_bb": -9.298324584960938e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AcQdJc.npz",
      "sum_bb": 5.999991416931152,
      "pot_bb": 6.0,
      "error_bb": -8.58306884765625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AcTd3c.npz",
      "sum_bb": 5.9999918937683105,
      "pot_bb": 6.0,
      "error_bb": -8.106231689453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ad4d3c.npz",
      "sum_bb": 5.9999940395355225,
      "pot_bb": 6.0,
      "error_bb": -5.9604644775390625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ad7c5c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ad7d4c.npz",
      "sum_bb": 5.999993562698364,
      "pot_bb": 6.0,
      "error_bb": -6.4373016357421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ad9d7c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AdJd7c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AdKdJc.npz",
      "sum_bb": 5.999990701675415,
      "pot_bb": 6.0,
      "error_bb": -9.298324584960938e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AdKdTc.npz",
      "sum_bb": 5.999990224838257,
      "pot_bb": 6.0,
      "error_bb": -9.775161743164062e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AdQc4c.npz",
      "sum_bb": 5.9999916553497314,
      "pot_bb": 6.0,
      "error_bb": -8.344650268554688e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AdTd2c.npz",
      "sum_bb": 5.999992609024048,
      "pot_bb": 6.0,
      "error_bb": -7.3909759521484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AdTd6c.npz",
      "sum_bb": 5.9999916553497314,
      "pot_bb": 6.0,
      "error_bb": -8.344650268554688e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah3d2c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah4d2c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah4d3c.npz",
      "sum_bb": 5.99999463558197,
      "pot_bb": 6.0,
      "error_bb": -5.364418029785156e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah5d2c.npz",
      "sum_bb": 5.999995589256287,
      "pot_bb": 6.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah5d3c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah6d2c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah6d3c.npz",
      "sum_bb": 5.999992609024048,
      "pot_bb": 6.0,
      "error_bb": -7.3909759521484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah7d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah7d3c.npz",
      "sum_bb": 5.999992370605469,
      "pot_bb": 6.0,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah8d2c.npz",
      "sum_bb": 5.999987840652466,
      "pot_bb": 6.0,
      "error_bb": -1.2159347534179688e-05
    },
    {
      "file": "ml/data/flops/sb_bb/Ah8d3c.npz",
      "sum_bb": 5.999992370605469,
      "pot_bb": 6.0,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah9d2c.npz",
      "sum_bb": 5.999989986419678,
      "pot_bb": 6.0,
      "error_bb": -1.0013580322265625e-05
    },
    {
      "file": "ml/data/flops/sb_bb/Ah9d3c.npz",
      "sum_bb": 5.999990701675415,
      "pot_bb": 6.0,
      "error_bb": -9.298324584960938e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Ah9d6c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhAd5c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhAd9c.npz",
      "sum_bb": 5.99998939037323,
      "pot_bb": 6.0,
      "error_bb": -1.0609626770019531e-05
    },
    {
      "file": "ml/data/flops/sb_bb/AhJd2c.npz",
      "sum_bb": 5.999990940093994,
      "pot_bb": 6.0,
      "error_bb": -9.059906005859375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhJd3c.npz",
      "sum_bb": 5.99999213218689,
      "pot_bb": 6.0,
      "error_bb": -7.867813110351562e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhKd2c.npz",
      "sum_bb": 5.999991178512573,
      "pot_bb": 6.0,
      "error_bb": -8.821487426757812e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhKd3c.npz",
      "sum_bb": 5.999992609024048,
      "pot_bb": 6.0,
      "error_bb": -7.3909759521484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhQd2c.npz",
      "sum_bb": 5.999992489814758,
      "pot_bb": 6.0,
      "error_bb": -7.510185241699219e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhQd3c.npz",
      "sum_bb": 5.999992370605469,
      "pot_bb": 6.0,
      "error_bb": -7.62939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhTd2c.npz",
      "sum_bb": 5.999988794326782,
      "pot_bb": 6.0,
      "error_bb": -1.1205673217773438e-05
    },
    {
      "file": "ml/data/flops/sb_bb/AhTd3c.npz",
      "sum_bb": 5.999993085861206,
      "pot_bb": 6.0,
      "error_bb": -6.9141387939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/AhTd4c.npz",
      "sum_bb": 5.999993681907654,
      "pot_bb": 6.0,
      "error_bb": -6.318092346191406e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jc5c2c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jc5d5c.npz",
      "sum_bb": 5.999997138977051,
      "pot_bb": 6.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jc9c4c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jc9d2c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jc9d5c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jc9d7c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JcTd2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jd5d3c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jd7c4c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jd7d4c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jd7d5c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jd8c6c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jd8d6c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JdJc5c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JdTd2c.npz",
      "sum_bb": 5.999993085861206,
      "pot_bb": 6.0,
      "error_bb": -6.9141387939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh3d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh4d2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh4d3c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh5d2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh5d3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh5d4c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh5d5c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh6d2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh6d3c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh7d2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh7d3c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh8d2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh8d3c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh9d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Jh9d3c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JhJdJc.npz",
      "sum_bb": 5.999991178512573,
      "pot_bb": 6.0,
      "error_bb": -8.821487426757812e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JhJdTc.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JhTd2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/JhTd3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kc7c6c.npz",
      "sum_bb": 5.999997854232788,
      "pot_bb": 6.0,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kc7d6c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kc9d2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KcJc4c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KcJc6c.npz",
      "sum_bb": 5.999994277954102,
      "pot_bb": 6.0,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KcTdTc.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kd6d4c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KdJc8c.npz",
      "sum_bb": 5.999993085861206,
      "pot_bb": 6.0,
      "error_bb": -6.9141387939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KdQc8c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KdQcJc.npz",
      "sum_bb": 5.999993562698364,
      "pot_bb": 6.0,
      "error_bb": -6.4373016357421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KdTc4c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KdTd5c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh3d2c.npz",
      "sum_bb": 5.9999918937683105,
      "pot_bb": 6.0,
      "error_bb": -8.106231689453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh4d2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh4d3c.npz",
      "sum_bb": 5.999994277954102,
      "pot_bb": 6.0,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh5d2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh5d3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh6d2c.npz",
      "sum_bb": 5.999994277954102,
      "pot_bb": 6.0,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh6d3c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh7d2c.npz",
      "sum_bb": 5.9999918937683105,
      "pot_bb": 6.0,
      "error_bb": -8.106231689453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh7d3c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh8d2c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh8d3c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh8d6c.npz",
      "sum_bb": 5.999992609024048,
      "pot_bb": 6.0,
      "error_bb": -7.3909759521484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh9d2c.npz",
      "sum_bb": 5.999992847442627,
      "pot_bb": 6.0,
      "error_bb": -7.152557373046875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Kh9d3c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhJd2c.npz",
      "sum_bb": 5.999993324279785,
      "pot_bb": 6.0,
      "error_bb": -6.67572021484375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhJd3c.npz",
      "sum_bb": 5.999994277954102,
      "pot_bb": 6.0,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhKd2c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhKdKc.npz",
      "sum_bb": 5.999997854232788,
      "pot_bb": 6.0,
      "error_bb": -2.1457672119140625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhQd2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhQd3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhQd7c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhTd2c.npz",
      "sum_bb": 5.999993085861206,
      "pot_bb": 6.0,
      "error_bb": -6.9141387939453125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/KhTd3c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qc3d2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qc7c6c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qc7d2c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qc9c4c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qc9d2c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qc9d3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QcTd2c.npz",
      "sum_bb": 5.999993562698364,
      "pot_bb": 6.0,
      "error_bb": -6.4373016357421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qd4d2c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qd6c3c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qd7c3c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qd9d5c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QdJc4c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QdQc3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QdTc7c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QdTd7c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh3d2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh4d2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh4d3c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh5d2c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh5d3c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh5d4c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh6d2c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh6d3c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh7d2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh7d3c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh7d4c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh7d5c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh8d2c.npz",
      "sum_bb": 5.999994516372681,
      "pot_bb": 6.0,
      "error_bb": -5.4836273193359375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh8d3c.npz",
      "sum_bb": 5.999995946884155,
      "pot_bb": 6.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh8d6c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh8d7c.npz",
      "sum_bb": 5.999996662139893,
      "pot_bb": 6.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh9d2c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Qh9d3c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QhJd2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QhJd3c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QhTd2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QhTd3c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/QhTd4c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Tc3d3c.npz",
      "sum_bb": 5.9999964237213135,
      "pot_bb": 6.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Tc7c2c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Tc8c3c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Td6c3c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Td7d5c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Td8c7c.npz",
      "sum_bb": 5.99999737739563,
      "pot_bb": 6.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th3d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th4d2c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th4d3c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th5d2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th5d3c.npz",
      "sum_bb": 5.999995231628418,
      "pot_bb": 6.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th6d2c.npz",
      "sum_bb": 5.999994993209839,
      "pot_bb": 6.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th6d3c.npz",
      "sum_bb": 5.999995470046997,
      "pot_bb": 6.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th7d2c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th7d3c.npz",
      "sum_bb": 5.9999964237213135,
      "pot_bb": 6.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th8d2c.npz",
      "sum_bb": 5.99999475479126,
      "pot_bb": 6.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th8d3c.npz",
      "sum_bb": 5.999996185302734,
      "pot_bb": 6.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th9d2c.npz",
      "sum_bb": 5.999993801116943,
      "pot_bb": 6.0,
      "error_bb": -6.198883056640625e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th9d3c.npz",
      "sum_bb": 5.999995708465576,
      "pot_bb": 6.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/Th9d6c.npz",
      "sum_bb": 5.999996900558472,
      "pot_bb": 6.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_bb/ThTd5c.npz",
      "sum_bb": 5.9999964237213135,
      "pot_bb": 6.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/4h3d2c.npz",
      "sum_bb": 1.9999958872795105,
      "pot_bb": 2.0,
      "error_bb": -4.112720489501953e-06
    },
    {
      "file": "ml/data/flops/sb_limp/5h3d2c.npz",
      "sum_bb": 1.9999950528144836,
      "pot_bb": 2.0,
      "error_bb": -4.947185516357422e-06
    },
    {
      "file": "ml/data/flops/sb_limp/5h4d2c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/5h4d3c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6d5d3c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6h3d2c.npz",
      "sum_bb": 1.9999951124191284,
      "pot_bb": 2.0,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6h4d2c.npz",
      "sum_bb": 1.9999951720237732,
      "pot_bb": 2.0,
      "error_bb": -4.827976226806641e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6h4d3c.npz",
      "sum_bb": 1.9999967515468597,
      "pot_bb": 2.0,
      "error_bb": -3.248453140258789e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6h5d2c.npz",
      "sum_bb": 1.9999953508377075,
      "pot_bb": 2.0,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6h5d3c.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/6h5d4c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7c6c2c.npz",
      "sum_bb": 1.999995470046997,
      "pot_bb": 2.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7c6d6c.npz",
      "sum_bb": 1.9999966025352478,
      "pot_bb": 2.0,
      "error_bb": -3.3974647521972656e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h3d2c.npz",
      "sum_bb": 1.9999960064888,
      "pot_bb": 2.0,
      "error_bb": -3.993511199951172e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h4d2c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h4d3c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h5d2c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h5d3c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h5d4c.npz",
      "sum_bb": 1.9999972581863403,
      "pot_bb": 2.0,
      "error_bb": -2.7418136596679688e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h6d2c.npz",
      "sum_bb": 1.999995470046997,
      "pot_bb": 2.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h6d3c.npz",
      "sum_bb": 1.9999967813491821,
      "pot_bb": 2.0,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/sb_limp/7h6d5c.npz",
      "sum_bb": 1.9999964237213135,
      "pot_bb": 2.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8c7c3c.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8c7c5c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h3d2c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h4d2c.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h4d3c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h5d2c.npz",
      "sum_bb": 1.9999950528144836,
      "pot_bb": 2.0,
      "error_bb": -4.947185516357422e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h5d3c.npz",
      "sum_bb": 1.9999957084655762,
      "pot_bb": 2.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h5d4c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h6d2c.npz",
      "sum_bb": 1.9999957084655762,
      "pot_bb": 2.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h6d3c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h7d2c.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h7d3c.npz",
      "sum_bb": 1.9999967813491821,
      "pot_bb": 2.0,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/sb_limp/8h8d8c.npz",
      "sum_bb": 1.9999975562095642,
      "pot_bb": 2.0,
      "error_bb": -2.4437904357910156e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c2d2c.npz",
      "sum_bb": 1.9999952912330627,
      "pot_bb": 2.0,
      "error_bb": -4.708766937255859e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c3d3c.npz",
      "sum_bb": 1.9999974966049194,
      "pot_bb": 2.0,
      "error_bb": -2.5033950805664062e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c4d2c.npz",
      "sum_bb": 1.9999953508377075,
      "pot_bb": 2.0,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c5d2c.npz",
      "sum_bb": 1.9999957084655762,
      "pot_bb": 2.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c6d2c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c6d5c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c7c2c.npz",
      "sum_bb": 1.9999958872795105,
      "pot_bb": 2.0,
      "error_bb": -4.112720489501953e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c8d4c.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9c8d8c.npz",
      "sum_bb": 1.999996840953827,
      "pot_bb": 2.0,
      "error_bb": -3.159046173095703e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9d4c2c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9d5c3c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9d6d5c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9d7d4c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9d8c3c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9d8d6c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h2d2c.npz",
      "sum_bb": 1.9999958872795105,
      "pot_bb": 2.0,
      "error_bb": -4.112720489501953e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h3d2c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h4d2c.npz",
      "sum_bb": 1.9999949932098389,
      "pot_bb": 2.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h4d3c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h5d2c.npz",
      "sum_bb": 1.999995470046997,
      "pot_bb": 2.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h5d3c.npz",
      "sum_bb": 1.9999966621398926,
      "pot_bb": 2.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h6d2c.npz",
      "sum_bb": 1.9999964237213135,
      "pot_bb": 2.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h6d3c.npz",
      "sum_bb": 1.9999964237213135,
      "pot_bb": 2.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h7d2c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h7d3c.npz",
      "sum_bb": 1.9999971389770508,
      "pot_bb": 2.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h8d2c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/9h8d3c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ac4d4c.npz",
      "sum_bb": 1.999997079372406,
      "pot_bb": 2.0,
      "error_bb": -2.9206275939941406e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ac6c5c.npz",
      "sum_bb": 1.9999966621398926,
      "pot_bb": 2.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ac7c4c.npz",
      "sum_bb": 1.999997317790985,
      "pot_bb": 2.0,
      "error_bb": -2.682209014892578e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ac7d4c.npz",
      "sum_bb": 1.999997079372406,
      "pot_bb": 2.0,
      "error_bb": -2.9206275939941406e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ac8d4c.npz",
      "sum_bb": 1.9999963641166687,
      "pot_bb": 2.0,
      "error_bb": -3.635883331298828e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AcJc2c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AcKd4c.npz",
      "sum_bb": 1.9999977946281433,
      "pot_bb": 2.0,
      "error_bb": -2.205371856689453e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AcQd5c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AcQd9c.npz",
      "sum_bb": 1.9999967515468597,
      "pot_bb": 2.0,
      "error_bb": -3.248453140258789e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AcQdJc.npz",
      "sum_bb": 1.9999954998493195,
      "pot_bb": 2.0,
      "error_bb": -4.500150680541992e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ad4d3c.npz",
      "sum_bb": 1.9999969005584717,
      "pot_bb": 2.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ad7c5c.npz",
      "sum_bb": 1.999997317790985,
      "pot_bb": 2.0,
      "error_bb": -2.682209014892578e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ad7d4c.npz",
      "sum_bb": 1.999997317790985,
      "pot_bb": 2.0,
      "error_bb": -2.682209014892578e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ad9d7c.npz",
      "sum_bb": 1.9999975562095642,
      "pot_bb": 2.0,
      "error_bb": -2.4437904357910156e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AdJd7c.npz",
      "sum_bb": 1.9999971985816956,
      "pot_bb": 2.0,
      "error_bb": -2.8014183044433594e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AdKdJc.npz",
      "sum_bb": 1.9999957084655762,
      "pot_bb": 2.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AdKdTc.npz",
      "sum_bb": 1.999997079372406,
      "pot_bb": 2.0,
      "error_bb": -2.9206275939941406e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AdQc4c.npz",
      "sum_bb": 1.9999955296516418,
      "pot_bb": 2.0,
      "error_bb": -4.470348358154297e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AdTd2c.npz",
      "sum_bb": 1.9999951720237732,
      "pot_bb": 2.0,
      "error_bb": -4.827976226806641e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AdTd6c.npz",
      "sum_bb": 1.9999969005584717,
      "pot_bb": 2.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah3d2c.npz",
      "sum_bb": 1.999995470046997,
      "pot_bb": 2.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah4d2c.npz",
      "sum_bb": 1.9999958276748657,
      "pot_bb": 2.0,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah4d3c.npz",
      "sum_bb": 1.999996840953827,
      "pot_bb": 2.0,
      "error_bb": -3.159046173095703e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah5d2c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah5d3c.npz",
      "sum_bb": 1.9999966621398926,
      "pot_bb": 2.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah6d2c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah6d3c.npz",
      "sum_bb": 1.9999976754188538,
      "pot_bb": 2.0,
      "error_bb": -2.3245811462402344e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah7d2c.npz",
      "sum_bb": 1.999996840953827,
      "pot_bb": 2.0,
      "error_bb": -3.159046173095703e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah7d3c.npz",
      "sum_bb": 1.9999973773956299,
      "pot_bb": 2.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah8d2c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah8d3c.npz",
      "sum_bb": 1.9999973773956299,
      "pot_bb": 2.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah9d2c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah9d3c.npz",
      "sum_bb": 1.9999976754188538,
      "pot_bb": 2.0,
      "error_bb": -2.3245811462402344e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Ah9d6c.npz",
      "sum_bb": 1.9999973773956299,
      "pot_bb": 2.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhAd5c.npz",
      "sum_bb": 1.9999973773956299,
      "pot_bb": 2.0,
      "error_bb": -2.6226043701171875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhAd9c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhJd2c.npz",
      "sum_bb": 1.999995470046997,
      "pot_bb": 2.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhJd3c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhKd2c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhKd3c.npz",
      "sum_bb": 1.9999969005584717,
      "pot_bb": 2.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhQd2c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhQd3c.npz",
      "sum_bb": 1.9999969005584717,
      "pot_bb": 2.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhTd2c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhTd3c.npz",
      "sum_bb": 1.9999971389770508,
      "pot_bb": 2.0,
      "error_bb": -2.86102294921875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/AhTd4c.npz",
      "sum_bb": 1.9999966025352478,
      "pot_bb": 2.0,
      "error_bb": -3.3974647521972656e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jc5c2c.npz",
      "sum_bb": 1.9999946355819702,
      "pot_bb": 2.0,
      "error_bb": -5.364418029785156e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jc5d5c.npz",
      "sum_bb": 1.9999947547912598,
      "pot_bb": 2.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jc9c4c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jc9d2c.npz",
      "sum_bb": 1.9999948143959045,
      "pot_bb": 2.0,
      "error_bb": -5.185604095458984e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jc9d5c.npz",
      "sum_bb": 1.9999954104423523,
      "pot_bb": 2.0,
      "error_bb": -4.589557647705078e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jc9d7c.npz",
      "sum_bb": 1.9999963641166687,
      "pot_bb": 2.0,
      "error_bb": -3.635883331298828e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JcTd2c.npz",
      "sum_bb": 1.9999948740005493,
      "pot_bb": 2.0,
      "error_bb": -5.125999450683594e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jd5d3c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jd7c4c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jd7d4c.npz",
      "sum_bb": 1.9999957084655762,
      "pot_bb": 2.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jd7d5c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jd8c6c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jd8d6c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JdJc5c.npz",
      "sum_bb": 1.9999958872795105,
      "pot_bb": 2.0,
      "error_bb": -4.112720489501953e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JdTd2c.npz",
      "sum_bb": 1.9999944567680359,
      "pot_bb": 2.0,
      "error_bb": -5.543231964111328e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh3d2c.npz",
      "sum_bb": 1.9999952912330627,
      "pot_bb": 2.0,
      "error_bb": -4.708766937255859e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh4d2c.npz",
      "sum_bb": 1.9999951124191284,
      "pot_bb": 2.0,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh4d3c.npz",
      "sum_bb": 1.9999963641166687,
      "pot_bb": 2.0,
      "error_bb": -3.635883331298828e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh5d2c.npz",
      "sum_bb": 1.9999955296516418,
      "pot_bb": 2.0,
      "error_bb": -4.470348358154297e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh5d3c.npz",
      "sum_bb": 1.9999960064888,
      "pot_bb": 2.0,
      "error_bb": -3.993511199951172e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh5d4c.npz",
      "sum_bb": 1.9999955296516418,
      "pot_bb": 2.0,
      "error_bb": -4.470348358154297e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh5d5c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh6d2c.npz",
      "sum_bb": 1.9999953508377075,
      "pot_bb": 2.0,
      "error_bb": -4.649162292480469e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh6d3c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh7d2c.npz",
      "sum_bb": 1.999994933605194,
      "pot_bb": 2.0,
      "error_bb": -5.066394805908203e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh7d3c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh8d2c.npz",
      "sum_bb": 1.9999950528144836,
      "pot_bb": 2.0,
      "error_bb": -4.947185516357422e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh8d3c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh9d2c.npz",
      "sum_bb": 1.9999950528144836,
      "pot_bb": 2.0,
      "error_bb": -4.947185516357422e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Jh9d3c.npz",
      "sum_bb": 1.999995470046997,
      "pot_bb": 2.0,
      "error_bb": -4.5299530029296875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JhJdJc.npz",
      "sum_bb": 1.999995231628418,
      "pot_bb": 2.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JhJdTc.npz",
      "sum_bb": 1.9999938607215881,
      "pot_bb": 2.0,
      "error_bb": -6.139278411865234e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JhTd2c.npz",
      "sum_bb": 1.9999949932098389,
      "pot_bb": 2.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/JhTd3c.npz",
      "sum_bb": 1.999994695186615,
      "pot_bb": 2.0,
      "error_bb": -5.304813385009766e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kc7c6c.npz",
      "sum_bb": 1.9999969601631165,
      "pot_bb": 2.0,
      "error_bb": -3.039836883544922e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kc7d6c.npz",
      "sum_bb": 1.9999969601631165,
      "pot_bb": 2.0,
      "error_bb": -3.039836883544922e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kc9d2c.npz",
      "sum_bb": 1.9999966025352478,
      "pot_bb": 2.0,
      "error_bb": -3.3974647521972656e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KcJc4c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KcJc6c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KcTdTc.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kd6d4c.npz",
      "sum_bb": 1.9999970197677612,
      "pot_bb": 2.0,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KdJc8c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KdQc8c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KdQcJc.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KdTc4c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KdTd5c.npz",
      "sum_bb": 1.9999961853027344,
      "pot_bb": 2.0,
      "error_bb": -3.814697265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh3d2c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh4d2c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh4d3c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh5d2c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh5d3c.npz",
      "sum_bb": 1.9999969005584717,
      "pot_bb": 2.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh6d2c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh6d3c.npz",
      "sum_bb": 1.999997317790985,
      "pot_bb": 2.0,
      "error_bb": -2.682209014892578e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh7d2c.npz",
      "sum_bb": 1.9999966025352478,
      "pot_bb": 2.0,
      "error_bb": -3.3974647521972656e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh7d3c.npz",
      "sum_bb": 1.9999979734420776,
      "pot_bb": 2.0,
      "error_bb": -2.0265579223632812e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh8d2c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh8d3c.npz",
      "sum_bb": 1.9999966025352478,
      "pot_bb": 2.0,
      "error_bb": -3.3974647521972656e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh8d6c.npz",
      "sum_bb": 1.9999970197677612,
      "pot_bb": 2.0,
      "error_bb": -2.9802322387695312e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh9d2c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Kh9d3c.npz",
      "sum_bb": 1.999997615814209,
      "pot_bb": 2.0,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhJd2c.npz",
      "sum_bb": 1.999995231628418,
      "pot_bb": 2.0,
      "error_bb": -4.76837158203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhJd3c.npz",
      "sum_bb": 1.9999967217445374,
      "pot_bb": 2.0,
      "error_bb": -3.2782554626464844e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhKd2c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhKdKc.npz",
      "sum_bb": 1.9999966025352478,
      "pot_bb": 2.0,
      "error_bb": -3.3974647521972656e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhQd2c.npz",
      "sum_bb": 1.9999958276748657,
      "pot_bb": 2.0,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhQd3c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhQd7c.npz",
      "sum_bb": 1.9999967813491821,
      "pot_bb": 2.0,
      "error_bb": -3.2186508178710938e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhTd2c.npz",
      "sum_bb": 1.9999955892562866,
      "pot_bb": 2.0,
      "error_bb": -4.410743713378906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/KhTd3c.npz",
      "sum_bb": 1.9999969005584717,
      "pot_bb": 2.0,
      "error_bb": -3.0994415283203125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qc3d2c.npz",
      "sum_bb": 1.9999952912330627,
      "pot_bb": 2.0,
      "error_bb": -4.708766937255859e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qc7c6c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qc7d2c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qc9c4c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qc9d2c.npz",
      "sum_bb": 1.9999949932098389,
      "pot_bb": 2.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qc9d3c.npz",
      "sum_bb": 1.999996840953827,
      "pot_bb": 2.0,
      "error_bb": -3.159046173095703e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QcTd2c.npz",
      "sum_bb": 1.9999942779541016,
      "pot_bb": 2.0,
      "error_bb": -5.7220458984375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qd4d2c.npz",
      "sum_bb": 1.9999952912330627,
      "pot_bb": 2.0,
      "error_bb": -4.708766937255859e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qd6c3c.npz",
      "sum_bb": 1.9999964237213135,
      "pot_bb": 2.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qd7c3c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qd9d5c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QdJc4c.npz",
      "sum_bb": 1.999994933605194,
      "pot_bb": 2.0,
      "error_bb": -5.066394805908203e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QdQc3c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QdTc7c.npz",
      "sum_bb": 1.999997079372406,
      "pot_bb": 2.0,
      "error_bb": -2.9206275939941406e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QdTd7c.npz",
      "sum_bb": 1.999996542930603,
      "pot_bb": 2.0,
      "error_bb": -3.4570693969726562e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh3d2c.npz",
      "sum_bb": 1.9999951720237732,
      "pot_bb": 2.0,
      "error_bb": -4.827976226806641e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh4d2c.npz",
      "sum_bb": 1.9999951124191284,
      "pot_bb": 2.0,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh4d3c.npz",
      "sum_bb": 1.9999959468841553,
      "pot_bb": 2.0,
      "error_bb": -4.0531158447265625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh5d2c.npz",
      "sum_bb": 1.9999948740005493,
      "pot_bb": 2.0,
      "error_bb": -5.125999450683594e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh5d3c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh5d4c.npz",
      "sum_bb": 1.9999958276748657,
      "pot_bb": 2.0,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh6d2c.npz",
      "sum_bb": 1.9999958276748657,
      "pot_bb": 2.0,
      "error_bb": -4.172325134277344e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh6d3c.npz",
      "sum_bb": 1.9999964833259583,
      "pot_bb": 2.0,
      "error_bb": -3.516674041748047e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh7d2c.npz",
      "sum_bb": 1.9999951124191284,
      "pot_bb": 2.0,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh7d3c.npz",
      "sum_bb": 1.999997079372406,
      "pot_bb": 2.0,
      "error_bb": -2.9206275939941406e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh7d4c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh7d5c.npz",
      "sum_bb": 1.999995768070221,
      "pot_bb": 2.0,
      "error_bb": -4.231929779052734e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh8d2c.npz",
      "sum_bb": 1.9999957084655762,
      "pot_bb": 2.0,
      "error_bb": -4.291534423828125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh8d3c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh8d6c.npz",
      "sum_bb": 1.999997615814209,
      "pot_bb": 2.0,
      "error_bb": -2.384185791015625e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh8d7c.npz",
      "sum_bb": 1.9999980330467224,
      "pot_bb": 2.0,
      "error_bb": -1.9669532775878906e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh9d2c.npz",
      "sum_bb": 1.9999952912330627,
      "pot_bb": 2.0,
      "error_bb": -4.708766937255859e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Qh9d3c.npz",
      "sum_bb": 1.9999961256980896,
      "pot_bb": 2.0,
      "error_bb": -3.874301910400391e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QhJd2c.npz",
      "sum_bb": 1.9999943375587463,
      "pot_bb": 2.0,
      "error_bb": -5.662441253662109e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QhJd3c.npz",
      "sum_bb": 1.9999948143959045,
      "pot_bb": 2.0,
      "error_bb": -5.185604095458984e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QhTd2c.npz",
      "sum_bb": 1.9999944567680359,
      "pot_bb": 2.0,
      "error_bb": -5.543231964111328e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QhTd3c.npz",
      "sum_bb": 1.9999947547912598,
      "pot_bb": 2.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/QhTd4c.npz",
      "sum_bb": 1.999994158744812,
      "pot_bb": 2.0,
      "error_bb": -5.841255187988281e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Tc3d3c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Tc7c2c.npz",
      "sum_bb": 1.9999947547912598,
      "pot_bb": 2.0,
      "error_bb": -5.245208740234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Tc8c3c.npz",
      "sum_bb": 1.9999951124191284,
      "pot_bb": 2.0,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Td6c3c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Td7d5c.npz",
      "sum_bb": 1.9999951124191284,
      "pot_bb": 2.0,
      "error_bb": -4.887580871582031e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Td8c7c.npz",
      "sum_bb": 1.9999964237213135,
      "pot_bb": 2.0,
      "error_bb": -3.5762786865234375e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th3d2c.npz",
      "sum_bb": 1.9999954104423523,
      "pot_bb": 2.0,
      "error_bb": -4.589557647705078e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th4d2c.npz",
      "sum_bb": 1.9999948143959045,
      "pot_bb": 2.0,
      "error_bb": -5.185604095458984e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th4d3c.npz",
      "sum_bb": 1.9999958872795105,
      "pot_bb": 2.0,
      "error_bb": -4.112720489501953e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th5d2c.npz",
      "sum_bb": 1.9999948740005493,
      "pot_bb": 2.0,
      "error_bb": -5.125999450683594e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th5d3c.npz",
      "sum_bb": 1.9999956488609314,
      "pot_bb": 2.0,
      "error_bb": -4.351139068603516e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th6d2c.npz",
      "sum_bb": 1.9999949932098389,
      "pot_bb": 2.0,
      "error_bb": -5.0067901611328125e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th6d3c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th7d2c.npz",
      "sum_bb": 1.9999955296516418,
      "pot_bb": 2.0,
      "error_bb": -4.470348358154297e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th7d3c.npz",
      "sum_bb": 1.9999960660934448,
      "pot_bb": 2.0,
      "error_bb": -3.933906555175781e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th8d2c.npz",
      "sum_bb": 1.9999952912330627,
      "pot_bb": 2.0,
      "error_bb": -4.708766937255859e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th8d3c.npz",
      "sum_bb": 1.9999966621398926,
      "pot_bb": 2.0,
      "error_bb": -3.337860107421875e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th9d2c.npz",
      "sum_bb": 1.999994933605194,
      "pot_bb": 2.0,
      "error_bb": -5.066394805908203e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th9d3c.npz",
      "sum_bb": 1.999996304512024,
      "pot_bb": 2.0,
      "error_bb": -3.6954879760742188e-06
    },
    {
      "file": "ml/data/flops/sb_limp/Th9d6c.npz",
      "sum_bb": 1.9999962449073792,
      "pot_bb": 2.0,
      "error_bb": -3.7550926208496094e-06
    },
    {
      "file": "ml/data/flops/sb_limp/ThTd5c.npz",
      "sum_bb": 1.9999950528144836,
      "pot_bb": 2.0,
      "error_bb": -4.947185516357422e-06
    },
    {
      "file": "ml/data/flops/utg_bb/4h3d2c.npz",
      "sum_bb": 5.099995851516724,
      "pot_bb": 5.1,
      "error_bb": -4.148483276011916e-06
    },
    {
      "file": "ml/data/flops/utg_bb/5h3d2c.npz",
      "sum_bb": 5.099995493888855,
      "pot_bb": 5.1,
      "error_bb": -4.50611114466426e-06
    },
    {
      "file": "ml/data/flops/utg_bb/5h4d2c.npz",
      "sum_bb": 5.099996089935303,
      "pot_bb": 5.1,
      "error_bb": -3.910064696910354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/5h4d3c.npz",
      "sum_bb": 5.099995851516724,
      "pot_bb": 5.1,
      "error_bb": -4.148483276011916e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6d5d3c.npz",
      "sum_bb": 5.099995255470276,
      "pot_bb": 5.1,
      "error_bb": -4.744529723765822e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6h3d2c.npz",
      "sum_bb": 5.099998831748962,
      "pot_bb": 5.1,
      "error_bb": -1.1682510372423849e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6h4d2c.npz",
      "sum_bb": 5.099998235702515,
      "pot_bb": 5.1,
      "error_bb": -1.7642974849962911e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6h4d3c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6h5d2c.npz",
      "sum_bb": 5.099997401237488,
      "pot_bb": 5.1,
      "error_bb": -2.59876251185176e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6h5d3c.npz",
      "sum_bb": 5.0999956130981445,
      "pot_bb": 5.1,
      "error_bb": -4.386901855113479e-06
    },
    {
      "file": "ml/data/flops/utg_bb/6h5d4c.npz",
      "sum_bb": 5.099996566772461,
      "pot_bb": 5.1,
      "error_bb": -3.4332275387072286e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7c6c2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7c6d6c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h3d2c.npz",
      "sum_bb": 5.099998950958252,
      "pot_bb": 5.1,
      "error_bb": -1.0490417476916036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h4d2c.npz",
      "sum_bb": 5.0999979972839355,
      "pot_bb": 5.1,
      "error_bb": -2.0027160640978536e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h4d3c.npz",
      "sum_bb": 5.099997401237488,
      "pot_bb": 5.1,
      "error_bb": -2.59876251185176e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h5d2c.npz",
      "sum_bb": 5.099997282028198,
      "pot_bb": 5.1,
      "error_bb": -2.717971801402541e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h5d3c.npz",
      "sum_bb": 5.099997282028198,
      "pot_bb": 5.1,
      "error_bb": -2.717971801402541e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h5d4c.npz",
      "sum_bb": 5.0999977588653564,
      "pot_bb": 5.1,
      "error_bb": -2.241134643199416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h6d2c.npz",
      "sum_bb": 5.099998474121094,
      "pot_bb": 5.1,
      "error_bb": -1.5258789058947286e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h6d3c.npz",
      "sum_bb": 5.099998950958252,
      "pot_bb": 5.1,
      "error_bb": -1.0490417476916036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/7h6d5c.npz",
      "sum_bb": 5.0999979972839355,
      "pot_bb": 5.1,
      "error_bb": -2.0027160640978536e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8c7c3c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8c7c5c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h3d2c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h4d2c.npz",
      "sum_bb": 5.099997043609619,
      "pot_bb": 5.1,
      "error_bb": -2.9563903805041036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h4d3c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h5d2c.npz",
      "sum_bb": 5.099996089935303,
      "pot_bb": 5.1,
      "error_bb": -3.910064696910354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h5d3c.npz",
      "sum_bb": 5.099995732307434,
      "pot_bb": 5.1,
      "error_bb": -4.267692565562697e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h5d4c.npz",
      "sum_bb": 5.099995732307434,
      "pot_bb": 5.1,
      "error_bb": -4.267692565562697e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h6d2c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h6d3c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h7d2c.npz",
      "sum_bb": 5.099995970726013,
      "pot_bb": 5.1,
      "error_bb": -4.029273986461135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h7d3c.npz",
      "sum_bb": 5.099997043609619,
      "pot_bb": 5.1,
      "error_bb": -2.9563903805041036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/8h8d8c.npz",
      "sum_bb": 5.099999308586121,
      "pot_bb": 5.1,
      "error_bb": -6.914138790392599e-07
    },
    {
      "file": "ml/data/flops/utg_bb/9c2d2c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c3d3c.npz",
      "sum_bb": 5.099997162818909,
      "pot_bb": 5.1,
      "error_bb": -2.8371810909533224e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c4d2c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c5d2c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c6d2c.npz",
      "sum_bb": 5.099997043609619,
      "pot_bb": 5.1,
      "error_bb": -2.9563903805041036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c6d5c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c7c2c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c8d4c.npz",
      "sum_bb": 5.099995851516724,
      "pot_bb": 5.1,
      "error_bb": -4.148483276011916e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9c8d8c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9d4c2c.npz",
      "sum_bb": 5.0999966859817505,
      "pot_bb": 5.1,
      "error_bb": -3.3140182491564474e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9d5c3c.npz",
      "sum_bb": 5.099997043609619,
      "pot_bb": 5.1,
      "error_bb": -2.9563903805041036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9d6d5c.npz",
      "sum_bb": 5.099997043609619,
      "pot_bb": 5.1,
      "error_bb": -2.9563903805041036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9d7d4c.npz",
      "sum_bb": 5.0999979972839355,
      "pot_bb": 5.1,
      "error_bb": -2.0027160640978536e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9d8c3c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9d8d6c.npz",
      "sum_bb": 5.099996089935303,
      "pot_bb": 5.1,
      "error_bb": -3.910064696910354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h2d2c.npz",
      "sum_bb": 5.0999990701675415,
      "pot_bb": 5.1,
      "error_bb": -9.298324581408224e-07
    },
    {
      "file": "ml/data/flops/utg_bb/9h3d2c.npz",
      "sum_bb": 5.099998116493225,
      "pot_bb": 5.1,
      "error_bb": -1.8835067745470724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h4d2c.npz",
      "sum_bb": 5.0999977588653564,
      "pot_bb": 5.1,
      "error_bb": -2.241134643199416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h4d3c.npz",
      "sum_bb": 5.099996566772461,
      "pot_bb": 5.1,
      "error_bb": -3.4332275387072286e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h5d2c.npz",
      "sum_bb": 5.099995255470276,
      "pot_bb": 5.1,
      "error_bb": -4.744529723765822e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h5d3c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h6d2c.npz",
      "sum_bb": 5.099997401237488,
      "pot_bb": 5.1,
      "error_bb": -2.59876251185176e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h6d3c.npz",
      "sum_bb": 5.099998593330383,
      "pot_bb": 5.1,
      "error_bb": -1.4066696163439474e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h7d2c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h7d3c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h8d2c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/9h8d3c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ac4d4c.npz",
      "sum_bb": 5.099994778633118,
      "pot_bb": 5.1,
      "error_bb": -5.221366881968947e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ac6c5c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ac7c4c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ac7d4c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ac8d4c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AcJc2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AcKd4c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AcQd5c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AcQd9c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AcQdJc.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ad4d3c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ad7c5c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ad7d4c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ad9d7c.npz",
      "sum_bb": 5.099993705749512,
      "pot_bb": 5.1,
      "error_bb": -6.294250487925979e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AdJd7c.npz",
      "sum_bb": 5.099995493888855,
      "pot_bb": 5.1,
      "error_bb": -4.50611114466426e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AdKdJc.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AdKdTc.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AdQc4c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AdTd2c.npz",
      "sum_bb": 5.099993348121643,
      "pot_bb": 5.1,
      "error_bb": -6.651878356578322e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AdTd6c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah3d2c.npz",
      "sum_bb": 5.099991798400879,
      "pot_bb": 5.1,
      "error_bb": -8.201599120738479e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah4d2c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah4d3c.npz",
      "sum_bb": 5.099995493888855,
      "pot_bb": 5.1,
      "error_bb": -4.50611114466426e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah5d2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah5d3c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah6d2c.npz",
      "sum_bb": 5.099995017051697,
      "pot_bb": 5.1,
      "error_bb": -4.982948302867385e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah6d3c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah7d2c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah7d3c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah8d2c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah8d3c.npz",
      "sum_bb": 5.099992394447327,
      "pot_bb": 5.1,
      "error_bb": -7.605552672984572e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah9d2c.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah9d3c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Ah9d6c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhAd5c.npz",
      "sum_bb": 5.099992990493774,
      "pot_bb": 5.1,
      "error_bb": -7.009506225230666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhAd9c.npz",
      "sum_bb": 5.099990367889404,
      "pot_bb": 5.1,
      "error_bb": -9.632110595347854e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhJd2c.npz",
      "sum_bb": 5.099990606307983,
      "pot_bb": 5.1,
      "error_bb": -9.393692016246291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhJd3c.npz",
      "sum_bb": 5.09999144077301,
      "pot_bb": 5.1,
      "error_bb": -8.559226989390822e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhKd2c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhQd2c.npz",
      "sum_bb": 5.099993467330933,
      "pot_bb": 5.1,
      "error_bb": -6.532669067027541e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhQd3c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhTd2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhTd3c.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/AhTd4c.npz",
      "sum_bb": 5.099992036819458,
      "pot_bb": 5.1,
      "error_bb": -7.963180541636916e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jc5c2c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jc5d5c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jc9c4c.npz",
      "sum_bb": 5.099992275238037,
      "pot_bb": 5.1,
      "error_bb": -7.724761962535354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jc9d2c.npz",
      "sum_bb": 5.099992871284485,
      "pot_bb": 5.1,
      "error_bb": -7.128715514781447e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jc9d5c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jc9d7c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/JcTd2c.npz",
      "sum_bb": 5.099995017051697,
      "pot_bb": 5.1,
      "error_bb": -4.982948302867385e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jd5d3c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jd7c4c.npz",
      "sum_bb": 5.09999692440033,
      "pot_bb": 5.1,
      "error_bb": -3.075599670054885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jd7d4c.npz",
      "sum_bb": 5.0999977588653564,
      "pot_bb": 5.1,
      "error_bb": -2.241134643199416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jd7d5c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jd8c6c.npz",
      "sum_bb": 5.099995017051697,
      "pot_bb": 5.1,
      "error_bb": -4.982948302867385e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jd8d6c.npz",
      "sum_bb": 5.099995970726013,
      "pot_bb": 5.1,
      "error_bb": -4.029273986461135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/JdJc5c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/utg_bb/JdTd2c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh3d2c.npz",
      "sum_bb": 5.099996447563171,
      "pot_bb": 5.1,
      "error_bb": -3.55243682825801e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh4d2c.npz",
      "sum_bb": 5.099996447563171,
      "pot_bb": 5.1,
      "error_bb": -3.55243682825801e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh4d3c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh5d2c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh5d3c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh5d4c.npz",
      "sum_bb": 5.099994778633118,
      "pot_bb": 5.1,
      "error_bb": -5.221366881968947e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh5d5c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh6d2c.npz",
      "sum_bb": 5.099997878074646,
      "pot_bb": 5.1,
      "error_bb": -2.121925353648635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh6d3c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh7d2c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh7d3c.npz",
      "sum_bb": 5.099997043609619,
      "pot_bb": 5.1,
      "error_bb": -2.9563903805041036e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh8d2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh8d3c.npz",
      "sum_bb": 5.099995017051697,
      "pot_bb": 5.1,
      "error_bb": -4.982948302867385e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh9d2c.npz",
      "sum_bb": 5.099992513656616,
      "pot_bb": 5.1,
      "error_bb": -7.486343383433791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Jh9d3c.npz",
      "sum_bb": 5.0999932289123535,
      "pot_bb": 5.1,
      "error_bb": -6.771087646129104e-06
    },
    {
      "file": "ml/data/flops/utg_bb/JhJdJc.npz",
      "sum_bb": 5.099999308586121,
      "pot_bb": 5.1,
      "error_bb": -6.914138790392599e-07
    },
    {
      "file": "ml/data/flops/utg_bb/JhJdTc.npz",
      "sum_bb": 5.099994778633118,
      "pot_bb": 5.1,
      "error_bb": -5.221366881968947e-06
    },
    {
      "file": "ml/data/flops/utg_bb/JhTd2c.npz",
      "sum_bb": 5.099994778633118,
      "pot_bb": 5.1,
      "error_bb": -5.221366881968947e-06
    },
    {
      "file": "ml/data/flops/utg_bb/JhTd3c.npz",
      "sum_bb": 5.099994778633118,
      "pot_bb": 5.1,
      "error_bb": -5.221366881968947e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kc7c6c.npz",
      "sum_bb": 5.099995255470276,
      "pot_bb": 5.1,
      "error_bb": -4.744529723765822e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kc7d6c.npz",
      "sum_bb": 5.099997878074646,
      "pot_bb": 5.1,
      "error_bb": -2.121925353648635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kc9d2c.npz",
      "sum_bb": 5.099993348121643,
      "pot_bb": 5.1,
      "error_bb": -6.651878356578322e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KcJc4c.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KcJc6c.npz",
      "sum_bb": 5.099993944168091,
      "pot_bb": 5.1,
      "error_bb": -6.055831908824416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KcTdTc.npz",
      "sum_bb": 5.099994778633118,
      "pot_bb": 5.1,
      "error_bb": -5.221366881968947e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kd6d4c.npz",
      "sum_bb": 5.09999692440033,
      "pot_bb": 5.1,
      "error_bb": -3.075599670054885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KdJc8c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KdQc8c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KdQcJc.npz",
      "sum_bb": 5.099992752075195,
      "pot_bb": 5.1,
      "error_bb": -7.247924804332229e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KdTc4c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KdTd5c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh3d2c.npz",
      "sum_bb": 5.099992156028748,
      "pot_bb": 5.1,
      "error_bb": -7.843971252086135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh4d2c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh4d3c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh5d2c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh5d3c.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh6d2c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh6d3c.npz",
      "sum_bb": 5.099996447563171,
      "pot_bb": 5.1,
      "error_bb": -3.55243682825801e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh7d2c.npz",
      "sum_bb": 5.099996328353882,
      "pot_bb": 5.1,
      "error_bb": -3.671646117808791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh7d3c.npz",
      "sum_bb": 5.099997162818909,
      "pot_bb": 5.1,
      "error_bb": -2.8371810909533224e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh8d2c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh8d3c.npz",
      "sum_bb": 5.099995255470276,
      "pot_bb": 5.1,
      "error_bb": -4.744529723765822e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh8d6c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh9d2c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Kh9d3c.npz",
      "sum_bb": 5.099995851516724,
      "pot_bb": 5.1,
      "error_bb": -4.148483276011916e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhJd2c.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhJd3c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhKd2c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhKdKc.npz",
      "sum_bb": 5.099993109703064,
      "pot_bb": 5.1,
      "error_bb": -6.890296935679885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhQd2c.npz",
      "sum_bb": 5.099995493888855,
      "pot_bb": 5.1,
      "error_bb": -4.50611114466426e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhQd3c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhQd7c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhTd2c.npz",
      "sum_bb": 5.099995732307434,
      "pot_bb": 5.1,
      "error_bb": -4.267692565562697e-06
    },
    {
      "file": "ml/data/flops/utg_bb/KhTd3c.npz",
      "sum_bb": 5.099996566772461,
      "pot_bb": 5.1,
      "error_bb": -3.4332275387072286e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qc3d2c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qc7c6c.npz",
      "sum_bb": 5.099996089935303,
      "pot_bb": 5.1,
      "error_bb": -3.910064696910354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qc7d2c.npz",
      "sum_bb": 5.099995970726013,
      "pot_bb": 5.1,
      "error_bb": -4.029273986461135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qc9c4c.npz",
      "sum_bb": 5.09999406337738,
      "pot_bb": 5.1,
      "error_bb": -5.936622619273635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qc9d2c.npz",
      "sum_bb": 5.099995136260986,
      "pot_bb": 5.1,
      "error_bb": -4.863739013316604e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qc9d3c.npz",
      "sum_bb": 5.099993586540222,
      "pot_bb": 5.1,
      "error_bb": -6.41345977747676e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QcTd2c.npz",
      "sum_bb": 5.099995493888855,
      "pot_bb": 5.1,
      "error_bb": -4.50611114466426e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qd4d2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qd6c3c.npz",
      "sum_bb": 5.09999692440033,
      "pot_bb": 5.1,
      "error_bb": -3.075599670054885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qd7c3c.npz",
      "sum_bb": 5.099995970726013,
      "pot_bb": 5.1,
      "error_bb": -4.029273986461135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qd9d5c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QdJc4c.npz",
      "sum_bb": 5.099995017051697,
      "pot_bb": 5.1,
      "error_bb": -4.982948302867385e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QdQc3c.npz",
      "sum_bb": 5.09999418258667,
      "pot_bb": 5.1,
      "error_bb": -5.817413329722854e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QdTc7c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QdTd7c.npz",
      "sum_bb": 5.099998116493225,
      "pot_bb": 5.1,
      "error_bb": -1.8835067745470724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh3d2c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh4d2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh4d3c.npz",
      "sum_bb": 5.099996089935303,
      "pot_bb": 5.1,
      "error_bb": -3.910064696910354e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh5d2c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh5d3c.npz",
      "sum_bb": 5.0999966859817505,
      "pot_bb": 5.1,
      "error_bb": -3.3140182491564474e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh5d4c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh6d2c.npz",
      "sum_bb": 5.0999956130981445,
      "pot_bb": 5.1,
      "error_bb": -4.386901855113479e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh6d3c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh7d2c.npz",
      "sum_bb": 5.099995970726013,
      "pot_bb": 5.1,
      "error_bb": -4.029273986461135e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh7d3c.npz",
      "sum_bb": 5.099996447563171,
      "pot_bb": 5.1,
      "error_bb": -3.55243682825801e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh7d4c.npz",
      "sum_bb": 5.099996566772461,
      "pot_bb": 5.1,
      "error_bb": -3.4332275387072286e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh7d5c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh8d2c.npz",
      "sum_bb": 5.0999943017959595,
      "pot_bb": 5.1,
      "error_bb": -5.698204040172072e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh8d3c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh8d6c.npz",
      "sum_bb": 5.0999977588653564,
      "pot_bb": 5.1,
      "error_bb": -2.241134643199416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh8d7c.npz",
      "sum_bb": 5.099997520446777,
      "pot_bb": 5.1,
      "error_bb": -2.4795532223009786e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh9d2c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Qh9d3c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QhJd2c.npz",
      "sum_bb": 5.099994540214539,
      "pot_bb": 5.1,
      "error_bb": -5.45978546107051e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QhJd3c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QhTd2c.npz",
      "sum_bb": 5.099996447563171,
      "pot_bb": 5.1,
      "error_bb": -3.55243682825801e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QhTd3c.npz",
      "sum_bb": 5.099996328353882,
      "pot_bb": 5.1,
      "error_bb": -3.671646117808791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/QhTd4c.npz",
      "sum_bb": 5.09999692440033,
      "pot_bb": 5.1,
      "error_bb": -3.075599670054885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Tc3d3c.npz",
      "sum_bb": 5.099997162818909,
      "pot_bb": 5.1,
      "error_bb": -2.8371810909533224e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Tc7c2c.npz",
      "sum_bb": 5.099994897842407,
      "pot_bb": 5.1,
      "error_bb": -5.102157592418166e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Tc8c3c.npz",
      "sum_bb": 5.099994421005249,
      "pot_bb": 5.1,
      "error_bb": -5.578994750621291e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Td6c3c.npz",
      "sum_bb": 5.099997639656067,
      "pot_bb": 5.1,
      "error_bb": -2.3603439327501974e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Td7d5c.npz",
      "sum_bb": 5.09999942779541,
      "pot_bb": 5.1,
      "error_bb": -5.722045894884786e-07
    },
    {
      "file": "ml/data/flops/utg_bb/Td8c7c.npz",
      "sum_bb": 5.0999977588653564,
      "pot_bb": 5.1,
      "error_bb": -2.241134643199416e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th3d2c.npz",
      "sum_bb": 5.099996328353882,
      "pot_bb": 5.1,
      "error_bb": -3.671646117808791e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th4d2c.npz",
      "sum_bb": 5.099998474121094,
      "pot_bb": 5.1,
      "error_bb": -1.5258789058947286e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th4d3c.npz",
      "sum_bb": 5.099996447563171,
      "pot_bb": 5.1,
      "error_bb": -3.55243682825801e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th5d2c.npz",
      "sum_bb": 5.09999692440033,
      "pot_bb": 5.1,
      "error_bb": -3.075599670054885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th5d3c.npz",
      "sum_bb": 5.09999680519104,
      "pot_bb": 5.1,
      "error_bb": -3.194808959605666e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th6d2c.npz",
      "sum_bb": 5.099996209144592,
      "pot_bb": 5.1,
      "error_bb": -3.7908554073595724e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th6d3c.npz",
      "sum_bb": 5.0999966859817505,
      "pot_bb": 5.1,
      "error_bb": -3.3140182491564474e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th7d2c.npz",
      "sum_bb": 5.099997282028198,
      "pot_bb": 5.1,
      "error_bb": -2.717971801402541e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th7d3c.npz",
      "sum_bb": 5.099997878074646,
      "pot_bb": 5.1,
      "error_bb": -2.121925353648635e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th8d2c.npz",
      "sum_bb": 5.09999692440033,
      "pot_bb": 5.1,
      "error_bb": -3.075599670054885e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th8d3c.npz",
      "sum_bb": 5.099995017051697,
      "pot_bb": 5.1,
      "error_bb": -4.982948302867385e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th9d2c.npz",
      "sum_bb": 5.099995374679565,
      "pot_bb": 5.1,
      "error_bb": -4.625320434215041e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th9d3c.npz",
      "sum_bb": 5.099994659423828,
      "pot_bb": 5.1,
      "error_bb": -5.340576171519729e-06
    },
    {
      "file": "ml/data/flops/utg_bb/Th9d6c.npz",
      "sum_bb": 5.099998354911804,
      "pot_bb": 5.1,
      "error_bb": -1.6450881954455099e-06
    },
    {
      "file": "ml/data/flops/utg_bb/ThTd5c.npz",
      "sum_bb": 5.099997162818909,
      "pot_bb": 5.1,
      "error_bb": -2.8371810909533224e-06
    },
    {
      "file": "ml/data/flops/sb_bb/8h8d8c.npz",
      "sum_bb": 5.999998569488525,
      "pot_bb": 6.0,
      "error_bb": -1.430511474609375e-06
    }
  ],
  "fold_ev_distribution_bb": {
    "min": -3.814697265625e-06,
    "p25": 0.0,
    "median": 0.0,
    "p75": 0.0,
    "max": 3.814697265625e-06
  }
}
```
