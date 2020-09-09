@echo off
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/Listener.java" -d "build/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/StandardOutput.java" -d "build/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/StandardError.java" -d "build/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/LibraryOutput.java" -d "build/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/LibraryError.java" -d "build/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/Decoder.java" -d "build/"