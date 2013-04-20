Torque meets heatmap
======================

This needs a ton of work still, but is work to merge the smart indexing of [torque](http://cartodb.github.com/torque) with a client side heatmap renderer. It uses [heatmap](http://sunng87.github.com/heatcanvas) from @sunng87 as a starting point. It then uses an invisible tile canvas layer to make replicable, predictable, bounded requests to cartodb for aggregated data. Returned cubes are then sent to heatmap for a seamless canvas rendering. 

Andrew Hill
@andrewxhill
